# 🗂️ Infrastructure as Code # Update me !!

This folder contains templates and projects for deploying Amazon DynamoDB resources to AWS using Infrastructure as Code (IaC) tools.

## 📁 CloudFormation

The cloudformation folder includes all the templates in this repository that are deployable via AWS CloudFormation. Each solution has a dedicated folder that contains a deployable CloudFormation template, along with a README.md file that explains the purpose of the template.

[Explore the CloudFormation templates »](./cloudformation/README.md)

## 📁 AWS CDK

The cdk folder contains AWS CDK projects, with one folder per solution that includes a deployable CDK stack. Each project has a README.md file that explains the importance of the solution, the pre-requisites, and how to deploy it.

[Check out the AWS CDK examples »](./cdk/README.md)

## 📁 Security

The security folder includes examples of IAM policies in JSON format that can be used to secure your DynamoDB resources. Optionally, you can find CDK and CloudFormation examples for these policies as well.

[Discover the DynamoDB security policies »](./security/README.md)
