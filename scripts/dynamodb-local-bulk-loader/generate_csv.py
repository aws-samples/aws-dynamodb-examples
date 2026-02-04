#!/usr/bin/env python3
"""
CLI script for generating sample CSV data for DynamoDB bulk loading.

This script generates realistic test data with patterns that would cause hot partitions
if written sequentially, demonstrating the need for shuffling in the loader implementations.
"""

import argparse
import sys
from pathlib import Path

from src.csv_generator import CSVGenerator


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate sample CSV data for DynamoDB bulk loading tests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate 10,000 records (default for development)
  python generate_csv.py --output sample_10k.csv

  # Generate 1 million records for production-scale testing
  python generate_csv.py --output sample_1m.csv --count 1000000

  # Generate 100 records for quick testing
  python generate_csv.py --output sample_100.csv --count 100
        """,
    )

    parser.add_argument(
        "--output",
        "-o",
        type=str,
        required=True,
        help="Output CSV file path (e.g., sample_10k.csv)",
    )

    parser.add_argument(
        "--count",
        "-c",
        type=int,
        default=10000,
        help="Number of records to generate (default: 10000)",
    )

    args = parser.parse_args()

    # Validate count
    if args.count <= 0:
        print(f"Error: Count must be positive, got {args.count}", file=sys.stderr)
        sys.exit(1)

    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Generating {args.count:,} records...")
    print(f"Output file: {args.output}")

    try:
        generator = CSVGenerator(output_file=args.output, num_records=args.count)
        generator.generate()
        print(f"✓ Successfully generated {args.count:,} records")
        print(f"✓ File saved to: {args.output}")
    except Exception as e:
        print(f"Error generating CSV: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
