"""Shared helpers for the DynamoDB vector search arXiv demo."""

import json

import boto3

import config

bedrock = boto3.client("bedrock-runtime")


def clean(text):
    """Collapse whitespace and newlines to single spaces."""
    return " ".join((text or "").split())


def generate_embedding(text):
    """Generate a vector embedding using Amazon Bedrock Titan Embeddings V2."""
    response = bedrock.invoke_model(
        modelId=config.EMBEDDING_MODEL,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            # Truncate to stay under Titan's input limit (see config.MAX_EMBED_CHARS).
            "inputText": text[:config.MAX_EMBED_CHARS],
            "dimensions": config.EMBEDDING_DIMENSIONS,
            "normalize": True,
        }),
    )
    result = json.loads(response["body"].read())
    return result["embedding"]
