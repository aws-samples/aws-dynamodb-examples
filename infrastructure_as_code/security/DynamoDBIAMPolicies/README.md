# Amazon DynamoDB IAM Example Policy as Templates

A selection of example Amazon DynamoDB and DAX IAM policies with more restrictive security that you should be using instead of the official AWS Managed policies for DynamoDB.

* ***[AmazonDynamoDBDataFullAccess](./AmazonDynamoDBDataFullAccess.json)*** - A templated policy that allows read/write access to DynamoDB tables, indexes, and streams as well as write access to base tables.
* ***[AmazonDynamoDBAcceleratorDataFullAccess](./AmazonDynamoDBAcceleratorDataFullAccess.json)*** - A template policy to allow read/write access to Amazon DynamoDB Accelerator (DAX) only.
* ***[AmazonDynamoDB+DAXDataFullAccess](./AmazonDynamoDB+DAXDataFullAccess.json)*** - A template policy for allowing read/write access to both Amazon DynamoDB and Amazon DynamoDB Accelerator (DAX).
* ***[AmazonDynamoDBInfrastructureFullAccess](./AmazonDynamoDBInfrastructureFullAccess.json)*** - A template to assign access the DynamoDB and DAX infrastructure so people can only manage those services, but not read or change data in any table, index, stream, or cache. For this policy, you could customize in a few ways. 1/ Update *${DDB::TableName}* to be a specific set of table names. 2/ Use the wildcard (\*) for *${DDB::TableName}* and *${AWS::Region}* to prevent someone from restoring a backup from a table and then setting a policy to allow themselves read access on the table.
* ***[AmazonDynamoDBStreamsOnlyAccess](./AmazonDynamoDBStreamsOnlyAccess.json)*** - A template to allow read-only access to DynamoDB Streams.
* ***[AmazonDynamoDBAppendOnlyAccess.json](./AmazonDynamoDBAppendOnlyAccess.json)*** - A template that would allow read and append only (so, no updates) for a DynamoDB table.

These policy examples are templatized, for the moment. The three template values you need to replace with value or wildcards are:

* *${AWS::Region}* - Replace with the region you want this policy to be effective in or a wildcard (*) for it to apply to all regions.
* *${AWS::AccountId}* - Replace with your AWS account ID or you can put a wildcard (*) for all accounts.
* *${DDB::TableName}* - Replace with the Amazon DynamoDB table name you wish the policy to apply to or wildcard (*) for the policy to apply to all tables.

Note: Stacking the wildcard values in the resources can give access to a user across entire accounts, geographic regions, etc. Please be careful. You can always take these policies and customize to your own needs.
