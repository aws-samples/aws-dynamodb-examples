# Print Distinct Partition Keys

This directory contains tools for working with partition keys in DynamoDB tables, including utilities to print distinct partition keys, load random test data, and test maximum values for different attribute types.

## Directory Structure

### 1. [Printer](./Printer)
Scripts in multiple programming languages to scan a DynamoDB table and print distinct partition keys.

- **Java**: Implementation in Java
- **Node.js**: Implementation in JavaScript for Node.js
- **Python**: Implementation in Python

These scripts help you analyze the distribution of data across partition keys, which is useful for identifying potential hot partitions and optimizing table design.

#### Table Data Model for Printer Scripts

The Printer scripts are designed to work with any DynamoDB table that has a composite key (partition key and sort key). The scripts dynamically determine the key structure from the table's schema:

```
TableName: <any-table-name>
KeySchema:
  - AttributeName: pk
    KeyType: HASH
  - AttributeName: sk
    KeyType: RANGE
AttributeDefinitions:
  - AttributeName: pk
    AttributeType: S
  - AttributeName: sk
    AttributeType: S
```

The scripts support tables with sort keys of any of the three supported DynamoDB key types:
- String (S)
- Number (N)
- Binary (B)

The Printer scripts:
1. Determines the partition key and sort key names from the table's key schema
2. Identifies the sort key's data type
3. Uses the appropriate maximum value for the sort key type when scanning
4. Efficiently retrieves only distinct partition key values

### Using the Printer Scripts

### Prerequisites
- AWS CLI configured with appropriate credentials
- Language-specific dependencies (Java, Node.js, or Python) depending on which scripts you want to use


Each language implementation provides the same functionality but with language-specific setup and execution steps:

#### Java Implementation

1. Navigate to the Java directory:
   ```
   cd Printer/java
   ```

2. Build the project using Maven:
   ```
   mvn clean package
   ```

3. Run the application:
   ```
   java -jar target/PrintDistinctPKs-1.0-SNAPSHOT.jar --table-name <your-table-name> --region <your-aws-region>
   ```

4. Alternatively, use Docker:
   ```
   docker build -t print-distinct-pks .

   docker run --rm -it \
     -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
     -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
     -e AWS_DEFAULT_REGION=<your-aws-region> \
     -e DYNAMODB_TABLE_NAME=<your-table-name> \
     print-distinct-pks
   ```

#### Node.js Implementation

1. Navigate to the Node.js directory:
   ```
   cd Printer/nodejs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the script:
   ```
   node print_distinct_pks.js --region <your-aws-region> --table-name <your-table-name>
   ```

#### Python Implementation

1. Navigate to the Python directory:
   ```
   cd Printer/python
   ```

2. Run the script:
   ```
   python print_distinct_pks.py --region <your-aws-region> --table-name <your-table-name>
   ```

### 2. [RandomLoader](./RandomLoader)
A Python script (`load_random_data.py`) that generates and loads random test data into DynamoDB tables.

Key features:
- Creates tables with different sort key types (string, number, binary)
- Generates random partition keys and sort keys
- Configurable number of items per partition key
- Useful for testing and benchmarking DynamoDB performance

#### Table Data Models for RandomLoader

The RandomLoader script creates three tables with different sort key types:

1. **String Sort Key Table (`sk-str-test-data`)**
   ```
   TableName: sk-str-test-data
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: S
   BillingMode: PAY_PER_REQUEST
   ```

2. **Number Sort Key Table (`sk-num-test-data`)**
   ```
   TableName: sk-num-test-data
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: N
   BillingMode: PAY_PER_REQUEST
   ```

3. **Binary Sort Key Table (`sk-bin-test-data`)**
   ```
   TableName: sk-bin-test-data
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: B
   BillingMode: PAY_PER_REQUEST
   ```

Each table is populated with random data:
- Random string partition keys (10 characters)
- Between 1 and 10 items per partition key
- Sort keys appropriate for each table type (string, number, or binary)
- Total of approximately 5,000 items per table


### Using the RandomLoader
1. Navigate to the RandomLoader directory
2. Review and modify the configuration variables at the top of `load_random_data.py` as needed
3. Run the script: `python load_random_data.py --region <your-aws-region>`


### 3. [LoadMaxValues](./LoadMaxValues)
Scripts to test the maximum values for different attribute types in DynamoDB.

- **Java**: Implementation in Java
- **Node.js**: Implementation in JavaScript for Node.js
- **Python**: Implementation in Python

These scripts are useful for understanding the limits of DynamoDB's data types and ensuring your application handles edge cases correctly.

#### Table Data Models for LoadMaxValues

The LoadMaxValues scripts create three tables to test maximum values for different sort key types:

1. **Maximum String Sort Key Table (`max-str-sk-test-python`)**
   ```
   TableName: max-str-sk-test-python
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: S
   BillingMode: PAY_PER_REQUEST
   ```
   - Tests with maximum string value: 256 repetitions of the maximum Unicode code point

2. **Maximum Number Sort Key Table (`max-num-sk-test-python`)**
   ```
   TableName: max-num-sk-test-python
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: N
   BillingMode: PAY_PER_REQUEST
   ```
   - Tests with maximum number value: 9.9999999999999999999999999999999999999E+125

3. **Maximum Binary Sort Key Table (`max-bin-sk-test-python`)**
   ```
   TableName: max-bin-sk-test-python
   KeySchema:
     - AttributeName: pk
       KeyType: HASH
     - AttributeName: sk
       KeyType: RANGE
   AttributeDefinitions:
     - AttributeName: pk
       AttributeType: S
     - AttributeName: sk
       AttributeType: B
   BillingMode: PAY_PER_REQUEST
   ```
   - Tests with maximum binary value: 1024 bytes of 0xFF

Each table contains a single item with a fixed partition key ("sample-pk-value") and a sort key set to the maximum value for its data type.

## Use Cases

1. **Analyze Partition Key Distribution**
   - Identify potential hot partitions
   - Verify that your partition key design distributes data evenly

2. **Generate Test Data**
   - Create test tables with specific characteristics
   - Populate tables with random data for performance testing

3. **Test DynamoDB Limits**
   - Verify how your application handles maximum values
   - Understand the practical limits of different DynamoDB data types

### Using the LoadMaxValues Scripts

The LoadMaxValues scripts create tables and test maximum values for different attribute types in DynamoDB. Here are instructions for running the implementations in different languages:

#### Java Implementation

1. Navigate to the Java directory:
   ```
   cd LoadMaxValues/java
   ```

2. Build the project using Maven:
   ```
   mvn clean package
   ```

3. Run the application:
   ```
   java -jar target/load-max-values-1.0.jar --region <your-aws-region>
   ```

4. Alternatively, use Docker:
   ```
   docker build -t load-max-values .

   docker run --rm -it \
     -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
     -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
     -e AWS_DEFAULT_REGION=<your-aws-region> \
     load-max-values
   ```

#### Python Implementation

1. Navigate to the Python directory:
   ```
   cd LoadMaxValues/python
   ```

2. Run the script:
   ```
   python load_max_values.py --region <your-aws-region>
   ```

#### Node.js Implementation

1. Navigate to the Node.js directory:
   ```
   cd LoadMaxValues/nodejs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the script:
   ```
   node load_max_values.js --region <your-aws-region>
   ```

The scripts will create three tables with different sort key types (string, number, binary) and insert items with maximum values for each type.
