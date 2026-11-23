"""Compiled LangGraph pipeline used by the RabbitMQ worker."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.graphs.nodes import GraphDependencies, build_nodes
from app.graphs.state import ScoringState


def build_resume_scoring_graph(deps: GraphDependencies) -> CompiledStateGraph:
    """Builds the document pipeline and the scoring chain.

    A document that cannot be read well enough goes to `manual_review` and
    stops there: it is never scored on a bad extraction.
    """
    nodes = build_nodes(deps)
    graph = StateGraph(ScoringState)

    graph.add_node("ingest", nodes["ingest"])
    graph.add_node("embed_chunks", nodes["embed_chunks"])
    graph.add_node("store_document", nodes["store_document"])
    graph.add_node("manual_review", nodes["manual_review"])
    graph.add_node("llm_extraction", nodes["llm_extraction"])
    graph.add_node("persist_resume", nodes["persist_resume"])
    graph.add_node("embed_job", nodes["embed_job"])
    graph.add_node("deterministic_scoring", nodes["deterministic_scoring"])
    graph.add_node("evaluation", nodes["evaluation"])
    graph.add_node("persist_match", nodes["persist_match"])

    graph.add_edge(START, "ingest")
    graph.add_edge("ingest", "embed_chunks")
    graph.add_edge("embed_chunks", "store_document")
    graph.add_conditional_edges(
        "store_document",
        nodes["route_after_ingest"],
        {"extract": "llm_extraction", "manual_review": "manual_review"},
    )
    graph.add_edge("llm_extraction", "persist_resume")
    graph.add_edge("persist_resume", "embed_job")
    graph.add_edge("embed_job", "deterministic_scoring")
    graph.add_edge("deterministic_scoring", "evaluation")
    graph.add_edge("evaluation", "persist_match")
    graph.add_edge("persist_match", END)
    graph.add_edge("manual_review", END)

    return graph.compile()
