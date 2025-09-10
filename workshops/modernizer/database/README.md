# MySQL Log Parser CLI

A command-line tool for parsing MySQL general logs and analyzing query patterns and performance metrics.

## Features

- Parses MySQL general log files
- Identifies and filters application queries from system queries
- Provides detailed statistics including:
  - Query frequency analysis
  - Throughput metrics
  - Query type distribution
  - Time-based analysis

## Usage

### Basic Usage

```bash
python mysql_log_parser.py mysql-query.log
```

### Save Output to File

```bash
python mysql_log_parser.py mysql-query.log -o analysis_report.md
```

### Make Script Executable (Optional)

```bash
chmod +x mysql_log_parser.py
./mysql_log_parser.py mysql-query.log
```

## Requirements

- Python 3.6+
- No external dependencies (uses only Python standard library)

## Output

The tool generates a comprehensive analysis report including:

1. **Overview**: Summary statistics and time spans
2. **Query Type Distribution**: Breakdown by SQL command type
3. **Detailed Query Analysis**: Each unique query with:
   - Execution frequency
   - First and last occurrence timestamps
   - Query throughput
   - Original SQL formatting

## Example Output

```
# MySQL Query Analysis Summary

## Overview
- Unique queries: 15
- Total query executions: 1,247
- Log time span: 2024-01-01 10:00:00 to 2024-01-01 11:30:00 (1:30:00)
- Active query span: 1:25:30
- Overall throughput: 13.86 queries/second
- Active throughput: 14.52 queries/second

## Query Type Distribution
- SELECT: 892 (71.5%)
- INSERT: 201 (16.1%)
- UPDATE: 154 (12.4%)

## All Queries By Frequency
...
```

## Files

- `mysql_log_parser.py` - Main CLI script
- `log_parser_tool.py` - Original tool-based implementation
- `requirements.txt` - Dependencies (standard library only)
- `README.md` - This documentation