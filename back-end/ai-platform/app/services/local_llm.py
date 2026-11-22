"""Structured output from the local llama.cpp chat server.

A small model on a CPU is not an API that answers with one clean JSON object.
It needs the fields in front of it, a short prompt and one repair attempt when
the answer does not match. A paid provider needs none of that: its
structured-output mode is reliable, so only the local route comes through
here.

The order inside one call:

1. ``response_format: json_object`` with a compact field list in the system
   prompt. This is what a 0.5 B model actually follows.
2. The same prompt without ``response_format``, for a server build that
   rejects it.
3. One repair, which hands the model the validation error it made.

Grammar mode (``response_format: json_schema``) is deliberately not used: on
this model and server it made the answer run to the token cap instead of
finishing, while the field list produced the same object in a third of the
tokens.

A transport failure (the server is down, the call ran out of time) is not
retried here: the caller falls through to the next route instead of spending
its budget on a dead server.
"""

from __future__ import annotations

import json
import logging
import re
from enum import Enum
from types import UnionType
from typing import Any, Union, get_args, get_origin

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from openai import LengthFinishReasonError
from pydantic import BaseModel, ValidationError
from pydantic.fields import FieldInfo

from app.core.config import Settings

logger = logging.getLogger(__name__)

_FENCE = re.compile(r"```(?:json)?", re.IGNORECASE)

_MESSAGES: tuple[str, ...] = ("json_object", "plain")


class LocalOutputInvalid(RuntimeError):
    """The server answered, but not with an object that matches the schema."""


class LocalModelUnavailable(RuntimeError):
    """The server could not be reached, or the call ran out of time."""


class _MethodUnsupported(RuntimeError):
    """The server refused the response format; the plain prompt may work."""


async def structured_output[SchemaT: BaseModel](
    settings: Settings,
    schema: type[SchemaT],
    *,
    system: str,
    user: str,
    timeout: float,
) -> SchemaT:
    """Asks the local model for one object, and insists on getting it."""
    prompt = _messages(system, user, schema, settings.local_llm_max_input_chars)
    errors: list[str] = []

    for mode in _MESSAGES:
        try:
            return await _invoke(settings, schema, prompt, mode, timeout)
        except (LocalOutputInvalid, _MethodUnsupported) as exc:
            errors.append(f"{mode}: {exc}")
            logger.info("The local model's %s answer was unusable: %s", mode, exc)

    # One repair: show the model what was wrong with its last answer.
    repair = [
        *prompt,
        HumanMessage(
            content=(
                f"Your previous answer was rejected: {errors[-1]}\n"
                "Return only one JSON object with the keys and types above. "
                "No prose, no markdown."
            )
        ),
    ]
    try:
        return await _invoke(settings, schema, repair, "json_object", timeout)
    except (LocalOutputInvalid, _MethodUnsupported) as exc:
        errors.append(f"repair: {exc}")

    raise LocalOutputInvalid("; ".join(errors))


def _messages(
    system: str,
    user: str,
    schema: type[BaseModel],
    max_input_chars: int,
) -> list[BaseMessage]:
    """The prompt carries the fields, so plain JSON mode can work.

    The JSON Schema document itself is not used as the instruction: it is long
    and full of keywords a small model has no use for. A field list says the
    same thing in a third of the tokens.

    The input is capped: a 0.5 B model on a CPU cannot read a 50 000 character
    resume within its context or its time budget.
    """
    instruction = (
        "Reply with one JSON object and nothing else: no prose, no markdown.\n"
        "The object has these keys:\n"
        f"{_schema_hint(schema)}"
    )
    return [
        SystemMessage(content=f"{system}\n\n{instruction}"),
        HumanMessage(content=user[:max_input_chars]),
    ]


def _schema_hint(schema: type[BaseModel], depth: int = 0) -> str:
    return "\n".join(
        f"- {name}: {_describe(name, field, depth)}" for name, field in schema.model_fields.items()
    )


def _describe(name: str, field: FieldInfo, depth: int) -> str:
    text = _type_text(field.annotation, depth)
    if field.is_required():
        return text
    return f"{text}, default {_default_text(field)}"


def _default_text(field: FieldInfo) -> str:
    """The default a small model should copy, including list/dict factories."""
    factory = field.default_factory
    if factory is not None:
        try:
            return _literal(factory())
        except Exception:
            return "empty"
    return _literal(field.default)


def _type_text(annotation: Any, depth: int) -> str:
    if annotation is None or annotation is type(None):
        return "null"

    origin = get_origin(annotation)
    if origin in {UnionType, Union}:
        parts = [_type_text(arg, depth) for arg in get_args(annotation)]
        if len(parts) == 2 and "null" in parts:
            other = parts[0] if parts[1] == "null" else parts[1]
            return f"{other} or null"
        return " or ".join(parts)
    if origin in {list, tuple}:
        args = get_args(annotation)
        inner = _type_text(args[0], depth) if args else "value"
        return f"array of {inner}"
    if origin is dict:
        return "object"

    if isinstance(annotation, type):
        if issubclass(annotation, Enum):
            return "one of " + ", ".join(json.dumps(member.value) for member in annotation)
        if issubclass(annotation, BaseModel):
            if depth >= 2:
                return "object"
            inner = "; ".join(
                f"{sub_name}: {_type_text(sub.annotation, depth + 1)}"
                for sub_name, sub in annotation.model_fields.items()
            )
            return f"object {{ {inner} }}"
        if issubclass(annotation, bool):
            # Before int: bool is a subclass of int.
            return "boolean"
        if issubclass(annotation, str):
            return "string"
        if issubclass(annotation, int):
            return "integer"
        if issubclass(annotation, float):
            return "number"

    return "value"


def _literal(value: Any) -> str:
    if isinstance(value, Enum):
        return json.dumps(value.value)
    if isinstance(value, BaseModel):
        return "{}"
    try:
        return json.dumps(value)
    except TypeError:
        return "null"


async def _invoke[SchemaT: BaseModel](
    settings: Settings,
    schema: type[SchemaT],
    messages: list[BaseMessage],
    mode: str,
    timeout: float,
) -> SchemaT:
    kwargs: dict[str, Any] = {
        "model": settings.local_llm_model,
        "api_key": settings.local_llm_api_key or "local",
        "base_url": settings.local_llm_base_url,
        "timeout": timeout,
        "max_retries": 0,
        "temperature": settings.local_llm_temperature,
        "max_tokens": settings.local_llm_max_tokens,
        # llama.cpp accepts these as request extensions. At temperature 0 a
        # 0.5 B model repeats a skills list until the token cap; a repetition
        # penalty is what makes it close the object instead.
        "extra_body": {
            "repeat_penalty": settings.local_llm_repeat_penalty,
            "repeat_last_n": settings.local_llm_repeat_last_n,
        },
    }
    if mode == "json_object":
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}

    chat = ChatOpenAI(**kwargs)

    try:
        answer = await chat.ainvoke(messages)
    except LengthFinishReasonError as exc:
        # The answer ran into the token cap, so it cannot be parsed. The plain
        # prompt or the repair may produce a shorter, complete object.
        raise LocalOutputInvalid("the answer hit the token cap") from exc
    except Exception as exc:
        if _is_format_rejection(exc):
            raise _MethodUnsupported(_one_line(exc)) from exc
        raise LocalModelUnavailable(f"{type(exc).__name__}: {_one_line(exc)}") from exc

    return _parse(schema, _answer_text(answer))


def _is_format_rejection(exc: Exception) -> bool:
    """Whether the server refused the request because of ``response_format``."""
    status = getattr(exc, "status_code", None)
    if status in {400, 404, 422}:
        return True
    return "response_format" in _one_line(exc).lower()


def _answer_text(answer: object) -> str:
    content = getattr(answer, "content", answer)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            part if isinstance(part, str) else str(part.get("text", "")) for part in content
        )
    return str(content)


def _parse[SchemaT: BaseModel](schema: type[SchemaT], text: str) -> SchemaT:
    payload = _load_json(text)
    if payload is None:
        raise LocalOutputInvalid("the answer contained no JSON object")

    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        raise LocalOutputInvalid(_summarise(exc)) from exc


def _load_json(text: str) -> Any | None:
    """Reads the first JSON object out of an answer, fences and prose included."""
    candidate = _FENCE.sub("", text).strip()
    start, end = candidate.find("{"), candidate.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None


def _summarise(exc: ValidationError) -> str:
    parts = []
    for error in exc.errors()[:3]:
        field = ".".join(str(part) for part in error["loc"]) or "(root)"
        parts.append(f"{field}: {error['msg']}")
    return f"{exc.error_count()} field(s) do not match: " + "; ".join(parts)


def _one_line(exc: Exception) -> str:
    return " ".join(str(exc).split())[:300]
