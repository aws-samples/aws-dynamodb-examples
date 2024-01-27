# Disclaimer

This code is provided purely as a code sample to demonstrate "how" to override the default credentials provided on DynamoDB Client instantiation in Java (AWS SDK v2).
It is not intended to work "out of the box" - changes must be made to integrate it effectively with your individual use case.

# Java Example code snippet 

This example demonstrates how to override IAM credentials configuration at the request-level, using the AWS Java SDK V2.
When initially creating the `DynamoDbClient`, you can add a field in the `builder()` for a `credentialsProvider(...)`,
which can be used as the default.

Then, you can re-use the same client to execute `PutItem` statements, using an `AwsRequestOverrideConfiguration`,
to override the default credentials provided in the builder field `credentialsProvider(...`). 
This override can be performed for every request, using the same `DynamoDbClient` object.

## OverrideCredentialsProviderOnPutItemRequest.java

The code snippet provided will compile, but it will fail to run as-is, because of three primary reasons:

1. The actual credentials provided are meant to be replaced by the user.
2. The `PutItemRequest` is not specifying a "valid schema" since it's targeting a non-existent (and unspecified) DynamoDB table.
3. The `DynamoDbClient` is using a `DefaultCredentialsProvider`, but the script doesn't live anywhere that can leverage that "default".
  * The assumption was that this would live on a host, or in a Lambda with these default environment variables defined.

## Required Changes

* Update the credentials.
* Change the names of the helper functions to suit your use case.

## Contribute!

Be the first to make this better with a Pull Request.

