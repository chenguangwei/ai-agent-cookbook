"""
RAG Evaluation Arena
====================
Compare different retrieval strategies (Dense vs Sparse vs Hybrid)
and evaluate answer quality with automated metrics.

Usage:
    pip install -r requirements.txt
    python main.py
"""

import os
import json
import time
from typing import Optional

# --- Configuration ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-your-key-here")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# ============================================================
# Step 1: Sample Knowledge Base
# Replace with your own documents for real evaluation
# ============================================================

DOCUMENTS = [
    {
        "id": "doc1",
        "title": "What are AI Agents?",
        "content": "AI agents are autonomous systems powered by large language models (LLMs) that can reason, plan, and take actions. Unlike simple chatbots, agents can use tools, access external data, and complete multi-step tasks independently. Key components include: a reasoning engine (LLM), tool integration, memory systems, and planning capabilities.",
    },
    {
        "id": "doc2",
        "title": "Retrieval-Augmented Generation (RAG)",
        "content": "RAG is a technique that enhances LLM responses by retrieving relevant information from external knowledge bases before generating answers. The process involves: 1) Converting documents into vector embeddings, 2) Storing them in a vector database, 3) At query time, finding the most similar documents, 4) Feeding them as context to the LLM. RAG reduces hallucination and keeps responses grounded in facts.",
    },
    {
        "id": "doc3",
        "title": "Vector Databases",
        "content": "Vector databases store high-dimensional embeddings and enable fast similarity search. Popular options include Pinecone (managed cloud), ChromaDB (open-source, embedded), Weaviate (open-source, full-featured), and pgvector (PostgreSQL extension). Key operations: insert vectors, query by similarity (cosine, L2, dot product), and filter by metadata.",
    },
    {
        "id": "doc4",
        "title": "Prompt Engineering for Agents",
        "content": "Effective agent prompts include: 1) Clear role definition, 2) Available tools description, 3) Output format specification, 4) Chain-of-thought instructions, 5) Error handling guidance. The ReAct pattern (Reasoning + Acting) prompts the agent to think step-by-step before using tools. Few-shot examples significantly improve tool selection accuracy.",
    },
    {
        "id": "doc5",
        "title": "Multi-Agent Systems",
        "content": "Multi-agent systems involve multiple AI agents collaborating on complex tasks. Architectures include: 1) Hierarchical (manager delegates to workers), 2) Peer-to-peer (agents communicate directly), 3) Pipeline (sequential processing). Frameworks like CrewAI, AutoGen, and LangGraph simplify multi-agent orchestration. Key challenges: coordination, conflict resolution, and shared memory.",
    },
]


# ============================================================
# Step 2: Retrieval Strategies
# ============================================================

def sparse_search(query: str, documents: list, top_k: int = 3) -> list:
    """
    Sparse retrieval using keyword matching (BM25-like).
    Counts keyword overlap between query and documents.
    """
    query_terms = set(query.lower().split())
    scored = []

    for doc in documents:
        content_terms = set(doc["content"].lower().split())
        title_terms = set(doc["title"].lower().split())
        # Title matches weighted 2x
        overlap = len(query_terms & content_terms) + 2 * len(query_terms & title_terms)
        scored.append((doc, overlap))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, score in scored[:top_k]]


def dense_search(query: str, documents: list, top_k: int = 3) -> list:
    """
    Dense retrieval using vector embeddings (ChromaDB).
    Requires: pip install chromadb sentence-transformers
    """
    try:
        import chromadb

        client = chromadb.Client()
        collection = client.get_or_create_collection(
            name="lab_docs",
            metadata={"hnsw:space": "cosine"},
        )

        # Add documents if collection is empty
        if collection.count() == 0:
            collection.add(
                ids=[doc["id"] for doc in documents],
                documents=[doc["content"] for doc in documents],
                metadatas=[{"title": doc["title"]} for doc in documents],
            )

        results = collection.query(query_texts=[query], n_results=top_k)
        doc_ids = results["ids"][0]

        return [doc for doc in documents if doc["id"] in doc_ids]

    except ImportError:
        print("⚠️  ChromaDB not installed. Falling back to sparse search.")
        return sparse_search(query, documents, top_k)


def hybrid_search(query: str, documents: list, top_k: int = 3) -> list:
    """
    Hybrid retrieval: combine sparse and dense results with re-ranking.
    """
    sparse_results = sparse_search(query, documents, top_k=5)
    dense_results = dense_search(query, documents, top_k=5)

    # Merge and deduplicate, preserving order
    seen = set()
    merged = []
    for doc in dense_results + sparse_results:
        if doc["id"] not in seen:
            seen.add(doc["id"])
            merged.append(doc)

    return merged[:top_k]


# ============================================================
# Step 3: LLM Answer Generation
# ============================================================

def generate_answer(query: str, context_docs: list) -> str:
    """Generate an answer using retrieved context."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

        context = "\n\n".join(
            [f"### {doc['title']}\n{doc['content']}" for doc in context_docs]
        )

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Answer the question based ONLY on the provided context. If the context doesn't contain enough information, say so. Be concise.",
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {query}",
                },
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"[LLM Error: {e}] Based on context: {context_docs[0]['content'][:200]}..."


# ============================================================
# Step 4: Evaluation Metrics
# ============================================================

def evaluate_retrieval(retrieved: list, expected_ids: list) -> dict:
    """Calculate retrieval quality metrics."""
    retrieved_ids = [doc["id"] for doc in retrieved]

    # Precision: how many retrieved docs are relevant
    relevant_retrieved = len(set(retrieved_ids) & set(expected_ids))
    precision = relevant_retrieved / len(retrieved_ids) if retrieved_ids else 0

    # Recall: how many relevant docs were retrieved
    recall = relevant_retrieved / len(expected_ids) if expected_ids else 0

    # F1 Score
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0

    return {"precision": precision, "recall": recall, "f1": f1}


# ============================================================
# Step 5: Run the Evaluation Arena
# ============================================================

# Test queries with expected relevant document IDs
TEST_QUERIES = [
    {
        "query": "How does RAG work?",
        "expected_docs": ["doc2", "doc3"],
    },
    {
        "query": "What tools do AI agents use?",
        "expected_docs": ["doc1", "doc4"],
    },
    {
        "query": "How do multiple agents collaborate?",
        "expected_docs": ["doc5"],
    },
    {
        "query": "What is vector similarity search?",
        "expected_docs": ["doc3", "doc2"],
    },
]

STRATEGIES = {
    "Sparse (Keyword)": sparse_search,
    "Dense (Vector)": dense_search,
    "Hybrid": hybrid_search,
}


def run_arena():
    """Run the full evaluation arena."""
    try:
        from rich.console import Console
        from rich.table import Table

        console = Console()
    except ImportError:
        console = None

    print("\n" + "=" * 60)
    print("🏟️  RAG Evaluation Arena")
    print("=" * 60)

    results = {name: {"precision": 0, "recall": 0, "f1": 0} for name in STRATEGIES}

    for test in TEST_QUERIES:
        print(f"\n📝 Query: \"{test['query']}\"")
        print("-" * 40)

        for strategy_name, search_fn in STRATEGIES.items():
            start = time.time()
            retrieved = search_fn(test["query"], DOCUMENTS, top_k=3)
            elapsed = time.time() - start

            metrics = evaluate_retrieval(retrieved, test["expected_docs"])
            for k in metrics:
                results[strategy_name][k] += metrics[k]

            retrieved_titles = [d["title"] for d in retrieved]
            print(f"  {strategy_name:20s} | P={metrics['precision']:.2f} R={metrics['recall']:.2f} F1={metrics['f1']:.2f} | {elapsed*1000:.1f}ms | {retrieved_titles}")

    # Average results
    n = len(TEST_QUERIES)
    print("\n" + "=" * 60)
    print("📊 Average Results")
    print("=" * 60)

    if console:
        table = Table(title="Strategy Comparison")
        table.add_column("Strategy", style="cyan")
        table.add_column("Precision", justify="right")
        table.add_column("Recall", justify="right")
        table.add_column("F1 Score", justify="right", style="bold")

        for name, metrics in results.items():
            table.add_row(
                name,
                f"{metrics['precision']/n:.2f}",
                f"{metrics['recall']/n:.2f}",
                f"{metrics['f1']/n:.2f}",
            )
        console.print(table)
    else:
        for name, metrics in results.items():
            print(f"  {name:20s} | P={metrics['precision']/n:.2f} R={metrics['recall']/n:.2f} F1={metrics['f1']/n:.2f}")

    print("\n✅ Evaluation complete!")
    print("\n💡 Next steps:")
    print("   1. Add your own documents to DOCUMENTS list")
    print("   2. Create custom TEST_QUERIES with expected results")
    print("   3. Try different embedding models in dense_search()")
    print("   4. Implement a re-ranking step in hybrid_search()")
    print("   5. Add answer quality evaluation (LLM-as-judge)")


if __name__ == "__main__":
    run_arena()
