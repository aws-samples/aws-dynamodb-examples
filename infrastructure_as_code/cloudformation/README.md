# AWS CloudFormation Templates

This folder includes all the templates in this repository that are deployable via AWS CloudFormation. Each solution has a dedicated folder that contains a deployable CloudFormation template, along with a `README.md` file that explains the purpose of the template.

## 📂 Global Tables

The [global_tables](./global_tables/README.md) folder contains a CloudFormation template that demonstrates how to set up a DynamoDB Global Table. DynamoDB Global Tables provide a fully managed solution for deploying a single, global database that offers low-latency access to data for globally distributed applications.
Features

    - Multi-Region Replication: The Global Table is automatically replicated across multiple AWS Regions, ensuring low-latency access to data for users worldwide.
    - Automatic Failover: In the event of a regional outage, the Global Table automatically fails over to another Region, maintaining high availability for your application.
    - Seamless Application Integration: Your application can access the Global Table using the standard DynamoDB API, without any additional complexity.

Getting Started

To deploy the DynamoDB Global Table solution, follow these steps:

    - Navigate to the global-tables folder.
    - Review the README.md file to understand the deployment prerequisites and configuration options.
    - Use the AWS CloudFormation console or CLI to deploy the provided template.
    - Monitor the stack creation and ensure the Global Table is successfully deployed.
