# DynamoDB Vector Search — Semantic Paper Search

Companion code for the blog post *Build semantic search with native vector support in Amazon DynamoDB*.

This walkthrough builds a semantic search application over research paper
abstracts: it generates embeddings with Amazon Bedrock (Titan Text Embeddings V2),
stores them alongside the paper data in Amazon DynamoDB, and runs vector
similarity searches directly in DynamoDB, no separate vector database required.

## Prerequisites

- Python 3.12+
- AWS credentials configured (`aws configure` or environment variables)
- Access to Amazon Bedrock and the `amazon.titan-embed-text-v2:0` model in your region
- A recent AWS SDK for Python that supports DynamoDB vector search

```bash
pip install -r requirements.txt
```

## Files

| File | Purpose |
|------|---------|
| `config.py` | Shared settings (table/index names, embedding model, dataset URL, sample size) |
| `helpers.py` | Shared `generate_embedding` helper (Bedrock Titan V2) used by steps 2 and 3 |
| `01_create_table.py` | Creates the `Papers` table with a vector index and waits until it is `ACTIVE` |
| `02_generate_embeddings.py` | Streams the dataset, generates embeddings, and writes items to DynamoDB |
| `03_search.py` | Runs example semantic searches against the vector index |
| `04_cleanup.py` | Deletes the `Papers` table (and its vector index) to avoid future charges |

## Usage

Run the scripts in order:

```bash
python 01_create_table.py        # create the table + vector index
python 02_generate_embeddings.py # stream data, embed, and load (~2-4 min for 1,000 papers)
python 03_search.py              # run example semantic searches
python 04_cleanup.py             # delete the table when you're done
```

By default the demo loads a **1,000-paper sample** to keep it fast and inexpensive.
Adjust `SAMPLE_SIZE` in `config.py` to load more.

## Dataset & attribution

Paper metadata is from the [arxiv-abstracts-2021](https://huggingface.co/datasets/gfissore/arxiv-abstracts-2021) dataset, licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain).

## Notes

- Vector indexes are supported only on tables using the on-demand (`PAY_PER_REQUEST`) capacity mode.
- We embed the paper **title + abstract**; the authors are stored on the item
  (and returned with results) but excluded from the embedding to keep the semantic signal focused.
- The embedding vector is **not** returned in search results by default (to keep query cost down).
  Request it explicitly via `ProjectionExpression` if you need it back.
- When you're done, run `04_cleanup.py` to delete the table and avoid incurring future charges.
