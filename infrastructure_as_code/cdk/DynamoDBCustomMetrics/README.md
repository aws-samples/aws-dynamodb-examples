# Track table size and item count histories with CloudWatch

Amazon DynamoDB populates many metrics about its operations to Amazon CloudWatch. 
At the time of this writing the list includes 33 metrics including: throughput consumed 
and provisioned, account and table limits, request latencies, system errors, and user errors.
Two metrics not included are the DynamoDB table size and item count. These values can be 
observed in the AWS Web Console and retrieved via a DescribeTable API call, however the 
values are not persisted to CloudWatch.

This repository includes source code that can be useful to track the history of these 
metrics, using a simple design that pushes these metrics to CloudWatch using AWS Lambda 
and Amazon EventBridge. The code can be deployed into your own account using AWS Cloud 
Development Kit (CDK). The end result is having easy access to the size and item counts 
of DynamoDB tables and indexes within CloudWatch.

![CloudWatch Screen Shot](screenshot.png?raw=true "CloudWatch Screen Shot")

Further instructions and explanation will be forthcoming.
