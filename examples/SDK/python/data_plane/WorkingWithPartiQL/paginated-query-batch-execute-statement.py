#!/usr/bin/python
# Author: Paolo Romeo <paolorom@amazon.com>
# License: Apache 2.0

# Description: this script performs batch update to a DynamoDB table leveraging 
# query pagination and PartiQL.

import boto3


TABLE = ""                      # DynamoDB table name
LIMIT =  25                     # Max items updated per batch. Upper limit: 25
PARTITION_KEY_NAME = ""         # Name of the attribute set as Partition Key
PARTITION_KEY_VALUE = ""        # Value of the Partition Key
SORT_KEY_NAME = ""              # Name of the attribute set as Sort Key


ATTRIBUTE_NAME_1 = "ExpirationDate" # Attribute(s) to update
PARAMS = {                          # New value(s) of the attribute(s) to update
    ATTRIBUTE_NAME_1: ""
}


# TODO: Update the implementation of this method to reflect your logic
def build_statement(item: dict):
    """
    This method builds an update statement that is later executed in batch
    :param item: element returned when performing a read operation in DynamoDB
    :return: str containing the statement to perform
    """

    statement_placeholder = "UPDATE {} SET {} = '{}' WHERE {} = '{}' AND {} = '{}'"

    return statement_placeholder.format(TABLE,
                                        ATTRIBUTE_NAME_1,
                                        PARAMS[ATTRIBUTE_NAME_1],
                                        PARTITION_KEY_NAME,
                                        item[PARTITION_KEY_NAME]['S'],
                                        SORT_KEY_NAME,
                                        item[SORT_KEY_NAME]['S'])


def paginated_update(ddb):
    """
    This method performs the update by retrieving and updating a maximum of {LIMIT}
    items leveraging pagination.
    :param ddb: low level client used to perform DynamoDB operations
    :return: None
    """

    # Getting the first (up to) {LIMIT} items to update
    # TODO: update the query operation to reflect your logic
    query_response = ddb.query(
        TableName=TABLE,
        KeyConditionExpression="#pk = :pk",
        Limit = LIMIT,
        FilterExpression="attribute_not_exists(#a1) AND #a2 IN (:v1, :v2, :v3)",
        ExpressionAttributeValues={
            ':pk': {'S': PARTITION_KEY_VALUE},
            ':v1': {'S': 'Value1'},
            ':v2': {'S': 'Value1'},
            ':v3': {'S': 'Value1'}
        },
        ExpressionAttributeNames={
            '#pk': PARTITION_KEY_NAME,
            '#a1': 'Attribute1',
            '#a2': 'Attribute2'
        }
    )

    print("First query executed")

    # Performing the first batch of updates
    statements = [{'Statement': build_statement(item)} for item in query_response['Items']]

    # If there are statements to perform...
    if statements:
        update_response = ddb.batch_execute_statement(Statements=statements)
        print("First batch update executed")


    # Updating the rest of items, processing {LIMIT} at each iteration
    while "LastEvaluatedKey" in query_response:
        print("Processing next page...")

        query_response = ddb.query(
            TableName=TABLE,
            KeyConditionExpression="#pk = :pk",
            Limit = LIMIT,
            FilterExpression="attribute_not_exists(#a1) AND #a2 IN (:v1, :v2, :v3)",
            ExpressionAttributeValues={
                ':pk': {'S': PARTITION_KEY_VALUE},
                ':v1': {'S': 'Value1'},
                ':v2': {'S': 'Value1'},
                ':v3': {'S': 'Value1'}
            },
            ExpressionAttributeNames={
                '#pk': PARTITION_KEY_NAME,
                '#a1': 'Attribute1',
                '#a2': 'Attribute2'
            },
            ExclusiveStartKey=query_response["LastEvaluatedKey"]
        )

        # Same as above for the update
        statements = [{'Statement': build_statement(item)} for item in query_response['Items']]

        # If there are statements to perform...
        if statements:
            update_response = ddb.batch_execute_statement(Statements=statements)
            
    print("Done!")


if __name__ == "__main__":
    ddb = boto3.client('dynamodb')

    paginated_update(ddb)