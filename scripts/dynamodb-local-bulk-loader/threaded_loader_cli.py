#!/usr/bin/env python3
"""
CLI script for multi-threaded Python DynamoDB CSV bulk loader.

This script uses Python's threading capabilities with boto3 to load CSV data
into DynamoDB with parallelism while avoiding hot partitions through shuffling.
"""

import argparse
import sys
from pathlib import Path

from src.threaded_loader import ThreadedDynamoDBLoader


def main():
    parser = argparse.ArgumentParser(
        description="Load CSV data into DynamoDB using multi-threaded Python with boto3",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Load CSV with auto-detected optimal settings (matches CPU cores)
  python threaded_loader_cli.py --csv sample_10k.csv --table MyTable

  # Load with custom worker count and batch size
  python threaded_loader_cli.py --csv sample_1m.csv --table MyTable --workers 20 --batch-size 25

  # Load to specific region
  python threaded_loader_cli.py --csv data.csv --table MyTable --region us-west-2

  # Load with custom retry settings
  python threaded_loader_cli.py --csv data.csv --table MyTable --max-retries 5
        """,
    )

    parser.add_argument(
        "--csv",
        type=str,
        required=True,
        help="Path to input CSV file",
    )

    parser.add_argument(
        "--table",
        "-t",
        type=str,
        required=True,
        help="DynamoDB table name",
    )

    parser.add_argument(
        "--region",
        "-r",
        type=str,
        default="us-east-1",
        help="AWS region (default: us-east-1)",
    )

    parser.add_argument(
        "--workers",
        "-w",
        type=int,
        default=None,
        help="Number of concurrent worker threads (default: auto-detect CPU cores)",
    )

    parser.add_argument(
        "--batch-size",
        "-b",
        type=int,
        default=25,
        help="Batch size for write operations (default: 25, max: 25)",
    )

    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="Maximum retry attempts for failed operations (default: 3)",
    )

    args = parser.parse_args()

    # Validate CSV file exists
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"Error: CSV file not found: {args.csv}", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print("Multi-threaded DynamoDB CSV Loader")
    print("=" * 60)
    print(f"CSV File:      {args.csv}")
    print(f"Table:         {args.table}")
    print(f"Region:        {args.region}")
    print(f"Workers:       {args.workers if args.workers else 'auto (CPU cores)'}")
    print(f"Batch Size:    {args.batch_size}")
    print(f"Max Retries:   {args.max_retries}")
    print("=" * 60)

    try:
        loader = ThreadedDynamoDBLoader(
            table_name=args.table,
            region=args.region,
            max_workers=args.workers,
            batch_size=args.batch_size,
            max_retries=args.max_retries,
        )

        # Run load operation
        result = loader.load_csv(args.csv)

        print("\n" + "=" * 60)
        print("Load Results")
        print("=" * 60)
        print(f"Total Records:     {result.total_records:,}")
        print(f"Successful Writes: {result.successful_writes:,}")
        print(f"Failed Writes:     {result.failed_writes:,}")
        print(f"Success Rate:      {result.success_rate():.2f}%")
        print(f"Duration:          {result.duration_seconds:.2f} seconds")
        print("=" * 60)

        if result.errors:
            print(f"\nErrors encountered ({len(result.errors)}):")
            for error in result.errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(result.errors) > 10:
                print(f"  ... and {len(result.errors) - 10} more errors")

        if result.failed_writes > 0:
            sys.exit(1)

    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
