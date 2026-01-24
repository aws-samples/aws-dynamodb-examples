# Recurring Payments Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB for a recurring payments system. This system allows for the management of user accounts, subscriptions to various services or products (SKUs), and the tracking of payment receipts. It is designed to handle billing cycles, payment reminders, and historical payment data.

## Key Entities

1. Account
2. Subscription
3. Receipt

## Design Approach

We employ a single table design with the following key structure:

- **Partition Key (PK)**: Identifies the Account context.
  - `ACC#<AccountId>`: Grouping all data (subscriptions and receipts) for a specific account.

- **Sort Key (SK)**: Identifies the specific entity (Subscription or Receipt) within the Account partition.
  - `SUB#<SubId>#SKU#<SKU>`: Identifies a specific subscription.
  - `REC#<ProcessedDate>#SKU#<SKU>`: Identifies a specific payment receipt.

### Attribute Examples

| PK        | SK                  | Entity       | Sample Attributes                                                   |
| :-------- | :------------------ | :----------- | :------------------------------------------------------------------ |
| `ACC#123` | `SUB#123#SKU#999`   | Subscription | Email, PaymentDay, PaymentAmount, NextPaymentDate, NextReminderDate |
| `ACC#123` | `REC#2023-05-28...` | Receipt      | ProcessedAmount, ProcessedDate, SKU, TTL                            |

## Access Patterns

The schema supports several key access patterns, utilizing both the base table and Global Secondary Indexes (GSIs).

### Base Table Patterns

| Access pattern                       | Operation  | Partition key value  | Sort key value                     |
| :----------------------------------- | :--------- | :------------------- | :--------------------------------- |
| Get all subscriptions for an account | Query      | `PK=ACC#<AccountId>` | `begins_with(SK, "SUB#")`          |
| Get all receipts for an account      | Query      | `PK=ACC#<AccountId>` | `begins_with(SK, "REC#")`          |
| Get specific subscription details    | GetItem    | `PK=ACC#<AccountId>` | `SK=SUB#<SubId>#SKU#<SKU>`         |
| Create new subscription              | PutItem    | `PK=ACC#<AccountId>` | `SK=SUB#<SubId>#SKU#<SKU>`         |
| Create new receipt                   | PutItem    | `PK=ACC#<AccountId>` | `SK=REC#<ProcessedDate>#SKU#<SKU>` |
| Update subscription                  | UpdateItem | `PK=ACC#<AccountId>` | `SK=SUB#<SubId>#SKU#<SKU>`         |

### Global Secondary Indexes (GSIs)

#### GSI-1: Reminder Workflow

Used to find subscriptions that need a payment reminder sent (`getDueRemindersByDate`).

- **Partition Key**: `NextReminderDate`
- **Sort Key**: `LastReminderDate`
- **Projection**: `INCLUDE` (SK, PK, SKU, Email, NextPaymentDate)

| Access pattern                                      | Operation | Partition key value       | Sort key value |
| :-------------------------------------------------- | :-------- | :------------------------ | :------------- |
| Find accounts needing reminders for a specific date | Query     | `NextReminderDate=<Date>` |                |

#### GSI-2: Payment Workflow

Used to find subscriptions that are due for payment processing (`getDuePaymentsByDate`).

- **Partition Key**: `NextPaymentDate`
- **Sort Key**: `LastPaymentDate`
- **Projection**: `INCLUDE` (PK, SK, Email, PaymentDay, PaymentAmount, SKU, PaymentDetails)

| Access pattern                                     | Operation | Partition key value      | Sort key value |
| :------------------------------------------------- | :-------- | :----------------------- | :------------- |
| Find accounts with payments due on a specific date | Query     | `NextPaymentDate=<Date>` |                |

## Goals

- Efficiently manage user subscriptions and payment lifecycles
- Support high-volume queries for daily payment processing and reminders
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [RecurringPaymentsSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/RecurringPayments/RecurringPaymentsSchema.json)

## Additional Information

- [Recurring payments schema design in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-schema-recurring-payments.html)
