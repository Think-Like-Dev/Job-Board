"""Compiled LangGraph pipeline used by the RabbitMQ worker (phase 3)."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.graphs.nodes import GraphDependencies, build_nodes
from app.graphs.state import ScoringState


def build_resume_scoring_graph(deps: GraphDependencies) -> CompiledStateGraph:
    nodes = build_nodes(deps)
    graph = StateGraph(ScoringState)
    graph.add_node("inspect_text", nodes["inspect_text"])
    graph.add_node("profile_fallback", nodes["profile_fallback"])
    graph.add_node("llm_extraction", nodes["llm_extraction"])
    graph.add_node("persist_resume", nodes["persist_resume"])
    graph.add_node("embedding", nodes["embedding"])
    graph.add_node("deterministic_scoring", nodes["deterministic_scoring"])
    graph.add_node("evaluation", nodes["evaluation"])
    graph.add_node("persist_match", nodes["persist_match"])

    graph.add_edge(START, "inspect_text")
    graph.add_conditional_edges(
        "inspect_text",
        nodes["route_after_inspect"],
        {"extract": "llm_extraction", "fallback": "profile_fallback"},
    )
    graph.add_edge("llm_extraction", "persist_resume")
    graph.add_edge("profile_fallback", "persist_resume")
    graph.add_edge("persist_resume", "embedding")
    graph.add_edge("embedding", "deterministic_scoring")
    graph.add_edge("deterministic_scoring", "evaluation")
    graph.add_edge("evaluation", "persist_match")
    graph.add_edge("persist_match", END)
    return graph.compile()
