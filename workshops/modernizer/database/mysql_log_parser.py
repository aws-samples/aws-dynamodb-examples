#!/usr/bin/env python3
"""
MySQL Log Parser CLI
Parses MySQL general logs and provides detailed query analysis.
"""

import argparse
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple, Optional


class MySQLLogParser:
    """MySQL log parser for analyzing query patterns and performance."""

    def __init__(self):
        self.log_pattern = re.compile(
            r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(\d+)\s+(\w+)\s+(.*)"
        )

    def is_application_query(self, query: str) -> bool:
        """Determine if a query is an application query vs a system query."""
        normalized_query = " ".join(query.upper().split())

        system_patterns = [
            "SHOW ", "SET ", "SELECT @@", "SELECT 1", "FLUSH ", "KILL ", "USE ",
            "DESCRIBE ", "ANALYZE ", "CHECK ", "OPTIMIZE ", "REPAIR ",
            "SELECT 'SAMPLE'", "SELECT DATABASE()", "SELECT GTID_SUBSET",
            "SELECT CONCAT('`', USER,", "SELECT NAME, VALUE FROM MYSQL.RDS_CONFIGURATION",
            "SELECT LEFT(DIGEST,", "SELECT CURRENT_NUMBER_OF_BYTES_USED",
            "PURGE BINARY LOGS", "SELECT UNIX_TIMESTAMP(NOW())",
            "SELECT HOST FROM INFORMATION_SCHEMA.PROCESSLIST",
            "SELECT MAX(TIME) AS LONGEST_RUNNING_QUERY",
        ]

        transaction_statements = [
            "START TRANSACTION", "BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE SAVEPOINT",
        ]

        if normalized_query in transaction_statements:
            return False

        if any(normalized_query.startswith(pattern) for pattern in system_patterns):
            return False

        excluded_keywords = [
            "INFORMATION_SCHEMA", "PERFORMANCE_SCHEMA", "MYSQL.RDS_", "MYSQL.SLAVE_",
            "MYSQL.GLOBAL_GRANTS", "RDSADMIN", "INNODB_TRX", "INNODB_METRICS",
        ]

        if any(keyword in normalized_query for keyword in excluded_keywords):
            return False

        if re.search(r"FROM\s+(\w+\.)?(\w+)", normalized_query):
            table_name = re.search(r"FROM\s+(\w+\.)?(\w+)", normalized_query).group(2)
            if table_name.upper() in ["PROCESSLIST", "TRIGGERS", "INNODB_TRX", "INNODB_METRICS"]:
                return False

        return True

    def parse_log(self, log_file_path: str) -> Tuple:
        """Parse MySQL general logs efficiently."""
        unique_queries = {}
        query_to_ids = defaultdict(set)
        current_query_lines = []
        current_timestamp = None
        current_id = None
        first_timestamp = None
        last_timestamp = None
        first_query_timestamp = None
        last_query_timestamp = None

        with open(log_file_path, "r") as log_file:
            for line in log_file:
                match = self.log_pattern.match(line)

                if match and current_query_lines:
                    first_query_timestamp, last_query_timestamp = self._process_query(
                        current_query_lines, current_timestamp, current_id,
                        unique_queries, query_to_ids, first_query_timestamp, last_query_timestamp
                    )
                    current_query_lines = []

                if match:
                    timestamp_str, id_str, command, query_content = match.groups()
                    try:
                        current_timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                        
                        if first_timestamp is None:
                            first_timestamp = current_timestamp
                        last_timestamp = current_timestamp
                        
                        current_id = int(id_str)
                        
                        if command.lower() in ["query", "execute"]:
                            current_query_lines.append(query_content.strip())
                    except ValueError:
                        continue
                else:
                    if current_query_lines:
                        current_query_lines.append(line.strip())

            if current_query_lines:
                first_query_timestamp, last_query_timestamp = self._process_query(
                    current_query_lines, current_timestamp, current_id,
                    unique_queries, query_to_ids, first_query_timestamp, last_query_timestamp
                )

        total_time = (last_timestamp - first_timestamp).total_seconds() if first_timestamp and last_timestamp else 0
        active_time = (last_query_timestamp - first_query_timestamp).total_seconds() if first_query_timestamp and last_query_timestamp else 0

        return (unique_queries, query_to_ids, total_time, active_time,
                first_timestamp, last_timestamp, first_query_timestamp, last_query_timestamp)

    def _process_query(self, current_query_lines: List[str], current_timestamp: datetime,
                      current_id: int, unique_queries: Dict[str, Dict], query_to_ids: Dict[str, Set[int]],
                      first_query_timestamp: Optional[datetime], last_query_timestamp: Optional[datetime]) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Process and record a single query."""
        full_query = "\n".join(current_query_lines).strip()

        if self.is_application_query(full_query):
            if full_query not in unique_queries:
                unique_queries[full_query] = {
                    "count": 1,
                    "first_occurrence": current_timestamp,
                    "last_occurrence": current_timestamp,
                    "original_format": "\n".join(current_query_lines),
                }
            else:
                unique_queries[full_query]["count"] += 1
                unique_queries[full_query]["last_occurrence"] = current_timestamp

            query_to_ids[full_query].add(current_id)

            if first_query_timestamp is None:
                first_query_timestamp = current_timestamp
            last_query_timestamp = current_timestamp

        return first_query_timestamp, last_query_timestamp

    def format_results(self, unique_queries, query_to_ids, total_time, active_time,
                      first_timestamp, last_timestamp, first_query_timestamp, last_query_timestamp):
        """Format results for display."""
        if not unique_queries:
            return "No application queries found in the log file."

        total_queries = sum(query_data["count"] for query_data in unique_queries.values())
        overall_throughput = total_queries / total_time if total_time > 0 else 0
        active_throughput = total_queries / active_time if active_time > 0 else 0

        results = ["# MySQL Query Analysis Summary"]
        
        results.append(f"\n## Overview")
        results.append(f"- Unique queries: {len(unique_queries)}")
        results.append(f"- Total query executions: {total_queries}")
        results.append(f"- Log time span: {first_timestamp} to {last_timestamp} ({timedelta(seconds=total_time)})")
        results.append(f"- Active query span: {timedelta(seconds=active_time)}")
        results.append(f"- Overall throughput: {overall_throughput:.2f} queries/second")
        results.append(f"- Active throughput: {active_throughput:.2f} queries/second")

        query_types = {}
        for query in unique_queries:
            query_type = query.strip().split()[0].upper() if query.strip() else "UNKNOWN"
            if query_type not in query_types:
                query_types[query_type] = 0
            query_types[query_type] += unique_queries[query]["count"]

        results.append(f"\n## Query Type Distribution")
        for q_type, count in sorted(query_types.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_queries) * 100 if total_queries > 0 else 0
            results.append(f"- {q_type}: {count} ({percentage:.1f}%)")

        results.append(f"\n## All Queries By Frequency")
        sorted_queries = sorted(unique_queries.items(), key=lambda x: x[1]["count"], reverse=True)

        for i, (query, data) in enumerate(sorted_queries, 1):
            query_time = (data["last_occurrence"] - data["first_occurrence"]).total_seconds()
            throughput = data["count"] / query_time if query_time > 0 else 0

            results.append(f"\n### Query {i} ({data['count']} executions)")
            results.append(f"```sql\n{data['original_format']}\n```")
            results.append(f"- First seen: {data['first_occurrence']}")
            results.append(f"- Last seen: {data['last_occurrence']}")
            results.append(f"- Frequency: {data['count']} times over {timedelta(seconds=query_time)}")
            results.append(f"- Throughput: {throughput:.2f} queries/second")

        return "\n".join(results)

    def analyze_log_file(self, log_file_path: str) -> str:
        """Main analysis function with validation."""
        if not os.path.exists(log_file_path):
            return f"Error: The file path '{log_file_path}' does not exist."

        if not os.path.isfile(log_file_path):
            return f"Error: '{log_file_path}' is a directory, not a file."

        if os.path.getsize(log_file_path) == 0:
            return f"Error: The file '{log_file_path}' is empty."

        if not os.access(log_file_path, os.R_OK):
            return f"Error: The file '{log_file_path}' is not readable."

        try:
            result = self.parse_log(log_file_path)
            return self.format_results(*result)
        except Exception as e:
            return f"Error analyzing MySQL log file '{log_file_path}': {str(e)}"


def main():
    parser = argparse.ArgumentParser(description="Parse MySQL general logs and analyze query patterns")
    parser.add_argument("log_file", help="Path to the MySQL log file to analyze")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    
    args = parser.parse_args()
    
    log_parser = MySQLLogParser()
    result = log_parser.analyze_log_file(args.log_file)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(result)
        print(f"Analysis saved to {args.output}")
    else:
        print(result)


if __name__ == "__main__":
    main()