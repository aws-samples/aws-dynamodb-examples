"""Shared configuration for the DynamoDB vector search arXiv demo."""

# DynamoDB
TABLE_NAME = "Papers"
INDEX_NAME = "VectorIndex"

# Amazon Bedrock embedding model
EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0"
EMBEDDING_DIMENSIONS = 1024   # Titan V2 supports 256, 512, or 1024
DISTANCE_FUNCTION = "DOT_PRODUCT"  # COSINE | DOT_PRODUCT | EUCLIDEAN (DOT_PRODUCT: embeddings are normalized to unit vectors)
MAX_EMBED_CHARS = 20000       # Truncate input to stay under Titan's limit (8,192 tokens / 50,000 chars)

# Dataset
DATASET_URL = "https://huggingface.co/datasets/gfissore/arxiv-abstracts-2021/resolve/main/arxiv-abstracts.jsonl.gz"
SAMPLE_SIZE = 1000   # Keep the walkthrough fast and inexpensive to reproduce
