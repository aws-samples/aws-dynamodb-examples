# 🔄 DynamoDB Migration Project

This sample development project presents the content explained in the [DynamoDB migration playbook](./documentation/migration-playbook.md). 
⚠️ This project is not intended to be deployed in production as-is, and it is your responsibility to complete and run proper testing in lower environments. ⚠️

## 🚀 Getting Started

To execute this CDK project, you'll need to provide the `sourceTableArn` and the `destinationTableArn` DynamoDB table ARNs. For the source table you must enable DynamoDB Streams to project [`NEW_AND_OLD_IMAGES`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html) view type for this solution to work properly.

📋 Before you begin, ensure your shell has credentials for the account you're operating in through your AWS profile or your environment variables.

Copy and paste your table ARNs into the shell variables while setting the correct AWS region to deploy the resources:

```bash
# Change to match your region. This should be the same region as the source table.
export AWS_DEFAULT_REGION=us-east-1
# The source table should be in the same account as the deployed resources.
export SOURCE_TABLE_ARN=arn:aws:dynamodb:us-east-1:111122223333:table/my-source-table
# If destination table is in a different account, follow the 'Cross-account access' section
export DEST_TABLE_ARN=arn:aws:dynamodb:us-east-1:111122223333:table/my-source-table-migrated
```

## 🍎 Setup for macOS (for brand new users)

If this is your first time running any CDK application and you happen to be on macOS, follow these instructions first to install dependencies.

**Prerequisites:**

- You should have [brew](https://brew.sh/) installed.
- You should set `AWS_DEFAULT_REGION` to the region you want to operate in.

Install the following packages with brew to begin:

```bash
brew install typescript
brew install aws-cdk
brew install node
```

With npm, Install the aws-cdk-lib to start:

```bash
npm i aws-cdk-lib
```

Then you need to bootstrap CDK:

```bash
cdk bootstrap -c sourceTableArn=$SOURCE_TABLE_ARN -c destinationTableArn=$DEST_TABLE_ARN
```

### 🚀 Deployment

The following command will generate the synthesized CloudFormation template, you can use this output to explore the stack that will be generated.

```bash
cdk synth -c sourceTableArn=$SOURCE_TABLE_ARN -c destinationTableArn=$DEST_TABLE_ARN
```

Once you are ready to deploy your solution you can execute it with the following command. Please remember the source table needs to have Amazon DynamoDB streams enabled.

```bash

cdk deploy -c sourceTableArn=$SOURCE_TABLE_ARN -c destinationTableArn=$DEST_TABLE_ARN
...
...
DdbMigration-source-table-To-destination-table | 33/33 | 11:45:37 AM | CREATE_COMPLETE      | AWS::CloudFormation::Stack          | DdbMigration-source-table-To-destination-table 

 ✅  DdbMigration-source-table-To-destination-table

✨  Deployment time: 81.71s

Outputs:
DdbMigration-source-table-To-destination-table.DestinationTablePolicy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:DescribeTable"
      ],
      "Principal": {
        "AWS": [
          "arn:aws:iam::1111222223333:role/DdbMigration-source-table-To-de-GlueJobRoleF1B69418-DiAybmqsORAy",
          "arn:aws:iam::1111222223333:role/DdbMigration-source-table-WriteCdcLambdaServiceRole-Zl7IcNJaFqsM"
        ]
      },
      "Resource": "arn:aws:dynamodb:us-east-1:1111222223333:table/destination-table"
    }
  ]
}
DdbMigration-source-table-To-destination-table.DirectMigrationJobName = DirectMigrationJob-l63F97BtqXQq
DdbMigration-source-table-To-destination-table.LargeMigrationJobName = LargeMigrationJob-VSYJGsC9ISBz
DdbMigration-source-table-To-destination-table.MigrationBucketName = ddbmigration-source-table--migrationbucket1234567
DdbMigration-source-table-To-destination-table.StateMachineArn = arn:aws:states:us-east-1:1111222223333:stateMachine:DdbMigration-source-table-To-destination-table
Stack ARN:
arn:aws:cloudformation:us-east-1:1111222223333:stack/DdbMigration-source-table-To-destination-table/eeab6590-eaf2-1111-a0a0-0affea56b8cb

✨  Total time: 86.88s
```

1. Run the `cdk deploy` command and note the output of the IAM policy in the Output _DestinationTablePolicy_.
2. Copy the IAM policy into your clipboard. This is a resource-based policy that must be applied to the destination DynamoDB table in your destination account. If you do not see this output, the script has determined the source and destination are the same AWS account. You can also see this output on the CloudFormation stack in the AWS Management Console.
3. Follow [these developer documentation instructions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-attach-resource-based-policy.html) to add the policy to your destination table, preferably using the AWS Management Console.
4. Execute the code in AWS Step Functions console as normal. The Lambda function WriteCdc will write cross-account into your table with the permissions granted by this resource-based policy

### 🌐 Cross-account access

The resources for the migration as well as the source DynamoDB table must be in the same account, but the destination table can be in any account. However, you must update the destination table's permissions with a [resource-based policy](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html) created and placed into the CloudFormation stack Outputs section in order for the replication to work.

> 📝 **Note:** _If you attempt to deploy this into an AWS account different from the source table's account, the CloudFormation stack creation will fail with an error due to a custom resource we made to validate account ids called AccountValidationCustomResource. If you make this mistake, you must run the clean-up step to destroy the stack._

### 🧹 Clean-up

To destroy the resources (when the migration is completed and you decide to cut-over), execute:

```bash
cdk destroy -c sourceTableArn=$SOURCE_TABLE_ARN -c destinationTableArn=$DEST_TABLE_ARN
```

### ⚠️ Current Limitations

- The current deployment assumes the deployed resources and the source table are in the same account. The destination table can be in a separate account.
- You must change the table ARNs and re-run `cdk deploy` for every table combination. You can't re-use the same stack for different table combinations.

## 👏 Acknowledgements

We would like to extend our heartfelt thanks to the major collaborators who made significant contributions to this project:

- 🌟 [Esteban Serna](https://github.com/tebanieo)
- 🌟 [Sean Shriver](https://github.com/switch180)
- 🌟 [John Terhune](https://github.com/terhunej)

Their expertise, dedication, and hard work have been instrumental in the development and success of this DynamoDB Migration Project. We are truly grateful for their valuable input and collaborative spirit.

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, improving documentation, or proposing new features, your efforts are greatly appreciated. Here are some ways you can contribute:

### 🚀 Feature Enhancements

- Help us increase the current throughput limitation of 9K TPS
- Implement new migration strategies or optimizations
- Add support for additional AWS services or integrations

### 🧪 Testing

- Improve and expand our unit test coverage
- Develop integration tests
- Perform thorough testing in various scenarios and environments

### 📚 Documentation

- Improve existing documentation for clarity and completeness
- Add examples, tutorials, or use cases
- Translate documentation to other languages

### 🧹 Code Quality

- Implement or improve linting configurations
- Refactor code for better readability and maintainability
- Optimize performance in existing codebase

### 🐛 Bug Hunting

- Identify and report bugs
- Provide detailed reproduction steps for issues
- Submit pull requests with bug fixes

### 💡 Ideas and Discussions

- Propose new features or improvements
- Participate in discussions about the project's direction
- Share your use cases and how the project could better support them

To get started:

1. Please create an [issue first](https://github.com/awslabs/amazon-dynamodb-tools/issues/new) to discuss your contribution.
2. Fork the repository
3. Create a new branch for your contribution
4. Make your changes
5. Submit a pull request with a clear description of your changes

Please ensure your code adheres to our coding standards and includes appropriate tests and documentation.

We look forward to your contributions and are excited to see how together we can improve this DynamoDB Migration Project!

#### 🛠 Original Readme - Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
