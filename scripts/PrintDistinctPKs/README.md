# Print Distinct Primary Keys

This repository contains tools for analyzing and testing DynamoDB tables by working with partition keys and loading test data with maximum-sized attributes. Multiple language implementations are provided for flexibility.

## Overview

This project provides three main utilities:
1. **Distinct PK Printer**: Prints all distinct partition keys from a DynamoDB table
2. **Max Values Test Data Loader**: Loads test data with maximum DynamoDB attribute sizes for testing and validation
3. **Random Data Loader**: Loads random test data into DynamoDB tables

## Project Structure

```
scripts/PrintDistinctPKs/
├── README.md                    # This file
├── java/                       # Maven multi-module project (recommended)
│   ├── pom.xml                 # Parent POM
│   ├── printer/                # DynamoDB Distinct PK Printer module
│   │   ├── pom.xml
│   │   └── src/main/java/org/example/PrintDistinctPKs.java
│   └── loader/                 # DynamoDB Max Values Test Data Loader module
│       ├── pom.xml
│       └── src/main/java/org/example/LoadMaxValues.java
├── Printer/                    # Alternative implementations
│   ├── nodejs/
│   │   ├── print_distinct_pks.js
│   │   └── package.json
│   └── python/
│       └── print_distinct_pks.py
├── LoadMaxValues/              # Alternative implementations
│   ├── nodejs/
│   │   ├── loadMaxValues.js
│   │   └── package.json
│   └── python/
│       └── load_max_values.py
└── RandomLoader/               # Random data loader
    └── load_random_data.py
```

## Prerequisites

- Java 11 or higher
- Maven 3.6 or higher
- AWS CLI configured with appropriate credentials
- DynamoDB table access permissions

## Building the Applications

Build all modules from the java directory:

```bash
cd scripts/PrintDistinctPKs/java
mvn clean package
```

This creates two executable JAR files:
- `printer/target/DynamoDBDistinctPKPrinter-1.0-SNAPSHOT.jar`
- `loader/target/DynamoDBMaxValuesTestDataLoader-1.0-SNAPSHOT.jar`

## Usage

### Java Implementation (Recommended)

Build the Java applications first:
```bash
cd java
mvn clean package
```

#### Distinct PK Printer

Print all distinct partition keys from a DynamoDB table:

```bash
java -jar printer/target/dynamodb-distinct-pk-printer-1.0-SNAPSHOT.jar <table-name> [region]
```

**Parameters:**
- `table-name`: Name of the DynamoDB table to analyze
- `region`: (Optional) AWS region (defaults to us-east-1)

**Example:**
```bash
java -jar printer/target/dynamodb-distinct-pk-printer-1.0-SNAPSHOT.jar MyTable us-west-2
```

#### Max Values Test Data Loader

Load test data with maximum DynamoDB attribute sizes:

```bash
java -jar loader/target/dynamodb-max-values-test-data-loader-1.0-SNAPSHOT.jar <table-name> [region]
```

**Parameters:**
- `table-name`: Name of the DynamoDB table to load test data into
- `region`: (Optional) AWS region (defaults to us-east-1)

**Example:**
```bash
java -jar loader/target/dynamodb-max-values-test-data-loader-1.0-SNAPSHOT.jar TestTable us-west-2
```

### Node.js Implementation

Prerequisites: Node.js 14+ and npm installed.

#### Distinct PK Printer

```bash
cd Printer/nodejs
npm install
node print_distinct_pks.js <table-name> [region]
```

**Example:**
```bash
node print_distinct_pks.js MyTable us-west-2
```

#### Max Values Test Data Loader

```bash
cd LoadMaxValues/nodejs
npm install
node loadMaxValues.js <table-name> [region]
```

**Example:**
```bash
node loadMaxValues.js TestTable us-west-2
```

### Python Implementation

Prerequisites: Python 3.7+ and boto3 installed.

Install dependencies:
```bash
pip install boto3
```

#### Distinct PK Printer

```bash
cd Printer/python
python print_distinct_pks.py <table-name> [region]
```

**Example:**
```bash
python print_distinct_pks.py MyTable us-west-2
```

#### Max Values Test Data Loader

```bash
cd LoadMaxValues/python
python load_max_values.py <table-name> [region]
```

**Example:**
```bash
python load_max_values.py TestTable us-west-2
```

#### Random Data Loader

```bash
cd RandomLoader
python load_random_data.py <table-name> [region] [number-of-items]
```

**Parameters:**
- `table-name`: Name of the DynamoDB table to load random data into
- `region`: (Optional) AWS region (defaults to us-east-1)
- `number-of-items`: (Optional) Number of random items to create (defaults to 100)

**Example:**
```bash
python load_random_data.py TestTable us-west-2 500
```

## Authentication

The applications use the AWS SDK's default credential provider chain, which checks for credentials in the following order:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM roles for EC2 instances
4. AWS CLI configuration

## Required IAM Permissions

### For Distinct PK Printer:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:Scan",
                "dynamodb:DescribeTable"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/YourTableName"
        }
    ]
}
```

### For Max Values Test Data Loader:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:CreateTable",
                "dynamodb:DescribeTable",
                "sts:GetCallerIdentity"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/YourTableName",
                "*"
            ]
        }
    ]
}
```

## Features

### Distinct PK Printer
- Scans entire DynamoDB table to find unique partition keys
- Handles all DynamoDB data types (String, Number, Binary)
- Displays partition key values in human-readable format
- Provides scan progress and timing information
- Supports consistent read operations

### Max Values Test Data Loader
- Creates test data with maximum DynamoDB attribute sizes
- Tests various attribute types:
  - Strings (up to 400KB)
  - Numbers (large numeric values)
  - Binary data (up to 400KB)
  - Boolean values
  - Lists and Maps
- Generates unique test records using account ID and timestamp
- Provides detailed logging of operations

## Development

### Building Individual Modules

Build only the printer:
```bash
cd printer
mvn clean package
```

Build only the loader:
```bash
cd loader
mvn clean package
```

### Code Structure

Both applications are built using:
- **AWS SDK for Java v2**: Modern, async-capable AWS SDK
- **Maven Shade Plugin**: Creates executable JARs with all dependencies
- **Standard Maven project structure**: Easy to maintain and extend

## Troubleshooting

### Common Issues

1. **"Unable to load AWS credentials"**
   - Ensure AWS CLI is configured: `aws configure`
   - Or set environment variables: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

2. **"Table not found"**
   - Verify table name and region
   - Ensure the table exists in the specified region

3. **"Access denied"**
   - Check IAM permissions for the required DynamoDB actions
   - Verify the credentials have access to the specific table

4. **OutOfMemoryError with large tables**
   - Increase JVM heap size: `java -Xmx2g -jar ...`
   - Consider processing tables in smaller segments

### Debugging

Enable detailed AWS SDK logging by adding JVM arguments:
```bash
java -Dorg.slf4j.simpleLogger.defaultLogLevel=debug -jar <jar-file> <arguments>
```

## Migration from Docker

This project has been migrated from Docker-based execution to direct Maven builds for improved security and simplified deployment. The previous Docker setup used public Docker images, which didn't align with security requirements. The new Maven-based approach:

- ✅ Eliminates dependency on public Docker images
- ✅ Provides direct executable JARs
- ✅ Simplifies CI/CD integration
- ✅ Reduces security attack surface
- ✅ Improves performance (no container overhead)

If you previously used Docker commands, here are the equivalent Maven commands:

**Old Docker approach:**
```bash
docker-compose run printer MyTable us-west-2
```

**New Maven approach:**
```bash
mvn clean package
java -jar printer/target/DynamoDBDistinctPKPrinter-1.0-SNAPSHOT.jar MyTable us-west-2
```

## License

This project is licensed under the same terms as the aws-dynamodb-examples repository.
