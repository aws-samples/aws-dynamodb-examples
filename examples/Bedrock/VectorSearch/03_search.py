"""
Step 3: Search the vector index. Generates an embedding for a natural-language
query and calls the SearchVectors API to find the most similar papers.
"""

import boto3

import config
from helpers import generate_embedding

dynamodb = boto3.client("dynamodb")


def search_papers(query_text, top_k=5):
    """Search for papers using semantic similarity."""
    query_embedding = generate_embedding(query_text)

    # The search vector is a List of Numbers, same shape as the stored attribute
    search_vector = [{"N": str(v)} for v in query_embedding]

    response = dynamodb.search_vectors(
        TableName=config.TABLE_NAME,
        IndexName=config.INDEX_NAME,
        SearchVector=search_vector,
        TopK=top_k,
        ReturnConsumedCapacity="INDEXES",
    )

    return response


def main():
    queries = [
        "detecting gravitational waves from black hole mergers",
        "improving the efficiency of solar cells",
        "quantum error correction for fault-tolerant computing",
    ]

    for query in queries:
        print(f"\nQuery: \"{query}\"")
        print("-" * 50)
        response = search_papers(query, top_k=3)
        for rank, result in enumerate(response["SearchResults"], 1):
            item = result["Item"]
            score = result.get("Score", "N/A")
            title = item["title"]["S"]
            print(f"  {rank}. {title}  (score: {score})")

        # The response reports the vector search bytes the query processed
        consumed = response.get("ConsumedCapacity", {})
        print(f"  VectorSearchRequestBytes: {consumed.get('VectorSearchRequestBytes')}")


if __name__ == "__main__":
    main()
