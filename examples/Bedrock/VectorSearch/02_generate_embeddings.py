"""
Step 2: Stream the arXiv abstracts dataset, generate embeddings with Amazon
Bedrock (Titan Text Embeddings V2), and write the items (with their vectors)
to DynamoDB.

Processes papers one at a time for simplicity. Expect roughly 2-4 minutes to
load the 1,000-paper sample; most of the time is spent in the Bedrock calls.
Raise config.SAMPLE_SIZE to load more, or parallelize the loop to go faster.
"""

import gzip
import json

import boto3
import requests

import config
from helpers import clean, generate_embedding

dynamodb = boto3.client("dynamodb")


def load_papers():
    """Stream the dataset and read only the first SAMPLE_SIZE papers.

    The file is a gzip-compressed JSON Lines corpus (~940 MB). Streaming reads
    only the bytes needed for SAMPLE_SIZE records rather than downloading it all.
    """
    papers = []
    headers = {"User-Agent": "aws-dynamodb-vector-search-sample"}
    with requests.get(config.DATASET_URL, stream=True, headers=headers) as resp:
        resp.raise_for_status()
        # Hugging Face serves an opaque .gz body, so decompress it explicitly.
        resp.raw.decode_content = False
        with gzip.GzipFile(fileobj=resp.raw) as gz:
            for _, line in zip(range(config.SAMPLE_SIZE), gz):
                papers.append(json.loads(line))
    return papers


def main():
    papers = load_papers()
    print(f"Loaded {len(papers)} papers. Generating embeddings and writing to DynamoDB...")

    for i, paper in enumerate(papers):
        title = clean(paper.get("title"))
        abstract = clean(paper.get("abstract"))

        # Combine title and abstract for a rich embedding
        text_to_embed = f"{title}. {abstract}"

        embedding = generate_embedding(text_to_embed)

        # Store the embedding as a List of Numbers (the vector attribute)
        embedding_list = {"L": [{"N": str(v)} for v in embedding]}

        dynamodb.put_item(
            TableName=config.TABLE_NAME,
            Item={
                "paper_id": {"S": paper["id"]},
                "title": {"S": title},
                "abstract": {"S": abstract},
                "authors": {"S": clean(paper.get("authors"))},
                "embedding": embedding_list,   # Vector attribute
            },
        )

        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(papers)} papers...")

    print(f"Done! {len(papers)} papers stored with embeddings.")


if __name__ == "__main__":
    main()
