# RAG Evaluation Arena

Compare different retrieval strategies and evaluate answer quality with automated metrics.

## What You'll Learn

- **Sparse retrieval**: Keyword matching (BM25-like) approach
- **Dense retrieval**: Vector embeddings with ChromaDB
- **Hybrid retrieval**: Combining sparse + dense with re-ranking
- **Evaluation metrics**: Precision, Recall, F1 for retrieval quality

## Quick Start

### Option A: Google Colab (Recommended)
Open `notebook.ipynb` in Google Colab — zero setup required.

### Option B: Local
```bash
pip install -r requirements.txt
python main.py
```

## Exercises

1. **Add your own documents** to the knowledge base
2. **Create custom test queries** with expected relevant docs
3. **Try different embedding models** (all-MiniLM-L6-v2, text-embedding-3-small, etc.)
4. **Implement re-ranking** in the hybrid search strategy
5. **Add LLM-as-judge** evaluation for answer quality
