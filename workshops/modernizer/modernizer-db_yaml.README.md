# 🚀 DynamoDB Modernization Infrastructure

> **CloudFormation Template for MySQL to DynamoDB Migration Workshop**

A comprehensive CloudFormation template that sets up all required infrastructure components for the database modernization workshop, simulating an on-premises environment with MySQL database and providing the complete toolkit for migration to Amazon DynamoDB.

## 🔧 Infrastructure Components

This template (`modernizer-db.yaml`) creates the following resources:

This CloudFormation (`modernizer-db.yaml`) template provisions the complete infrastructure needed for database modernization workshops, focusing on MySQL to DynamoDB migration paths.

The template creates a secure development environment based on VS Code Server, accessible through a browser and protected by user authentication. Workshop materials and utilities come pre-loaded in the environment. The database layer consists of a fully configured MySQL instance populated with sample e-commerce data, along with monitoring capabilities and secure credential management.

Network infrastructure is configured with appropriate security groups and VPC endpoints to ensure secure communication between services. A CloudFront distribution provides fast, secure access to the development interface.

The migration components include necessary IAM roles for DynamoDB replication, Glue ETL processes, and Lambda functions. An S3 bucket serves as the staging area, while pre-configured Glue connections streamline the database migration process. Docker support is included for compatibility testing across environments.

## 📋 Prerequisites

Before deploying this CloudFormation template, ensure you have:

1. **AWS Account Access**: Administrative permissions in your AWS account
2. **Public IP Address**: Your current public IP address for security group configuration
3. **Region Selection**: Choose a region with support for all required services
4. **CloudFormation Knowledge**: Basic understanding of AWS CloudFormation

## 🚀 Deployment Instructions

### Step 1: Deploy CloudFormation Template

1. Navigate to the AWS CloudFormation console
2. Click "Create stack" > "With new resources"
3. Upload the `modernizer-db.yaml` file
4. Complete the parameters form with required information:
   - Environment name
   - Your public IP address for access control

### Step 2: Accessing Your Development Environment.
Once your CloudFormation template is CREATE_COMPLETE, access the "Outputs" tab to retrieve your environment credentials.

<img width="1482" height="508" alt="image" src="https://github.com/user-attachments/assets/6d069ca9-5ee6-4f7b-ab5f-6fb2d42b6409" />

Locate these two important values:
   - VSCodeServerPassword - Authentication credential for your VS Code instance
   - VSCodeServerURLModernizer - Direct endpoint to your cloud-based IDE

Your values are unique to you and will differ from the above example.

Click the VSCodeServerURLModernizer to launch your development environment. Enter the password when prompted and allow approximately 60 seconds for the environment to initialize. Any startup notifications can be safely dismissed.

## 🔍 Infrastructure Details

### 📊 Resource Specifications

| Component | Specification | Notes |
|-----------|---------------|-------|
| EC2 Instance | t4g.large | ARM-based for cost optimization |
| Storage | 40 GB gp3 | Encrypted EBS volume |
| MySQL | 8.0+ | Community edition |
| Network | Default VPC | VPC endpoints for optimization |
| Python | 3.13 | Latest version for compatibility |
| Node.js | v18 | LTS version for stability |

## 🚮 Cleanup Instructions

1. Delete DynamoDB tables (Users, Products, Categories) created for this workshop.
2. Delete Glue jobs (users_migration_job, product_migration_job, categories_migration_job) created for this workshop.
3. Delete the stack, it should delete the rest of the resources.


