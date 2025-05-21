# Complaint Management System Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB as a datastore for a complaint management system that efficiently handles customer complaints, agent interactions, and complaint status tracking. The system allows for creating complaints, tracking communications, managing escalations, and monitoring complaint status changes.

## Key Entities

1. Complaint
2. Communication
3. Customer
4. Agent

## Design Approach

We employ a single-table design with a composite primary key and multiple Global Secondary Indexes (GSIs) to support various access patterns.

The following key structures are used:

- Base table
  - For a complaint item:
    - Partition key (PK)
      - Complaint ID (e.g., "Complaint123")
    - Sort key (SK)
      - "metadata" for complaint details
  - For a communication item:
    - Partition key (PK)
      - Complaint ID (e.g., "Complaint123")
    - Sort key (SK)
      - "comm#[timestamp]#[comm_id]" for communications

  - Examples:

    | PK | SK | Sample Attributes |
    | ----------- | ----------- | ----------- |
    | Complaint123 | metadata | customer_id, severity, complaint_description, current_state |
    | Complaint123 | comm#2023-05-01T14:30:00Z#comm456 | agentID, comm_text, complaint_state |

- Global Secondary Indexes:

  1. **Customer_Complaint_GSI**
     - Partition key: customer_id
     - Sort key: complaint_id
     
     - Example:
     
       | customer_id | complaint_id | Sample Attributes |
       | ----------- | ----------- | ----------- |
       | custXYZ | Complaint123 | PK, SK, severity, current_state |

  2. **Escalations_GSI**
     - Partition key: escalated_to
     - Sort key: escalation_time
     
     - Example:
     
       | escalated_to | escalation_time | Sample Attributes |
       | ----------- | ----------- | ----------- |
       | AgentB | 2023-05-02T09:15:00Z | PK, SK, severity, customer_id |

  3. **Agents_Comments_GSI**
     - Partition key: agentID
     - Sort key: comm_date
     
     - Example:
     
       | agentID | comm_date | Sample Attributes |
       | ----------- | ----------- | ----------- |
       | AgentA | 2023-05-01T14:30:00Z | PK, SK, comm_text, complaint_state |

## Access Patterns

The schema design efficiently supports the following access patterns:

| Access pattern | Base table/GSI | Operation | Partition key value | Sort key value | Other conditions/Filters |
| ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| Get complaint metadata | Base table | GetItem | PK=\<ComplaintID\> | SK="metadata" | |
| Get all communications for a complaint | Base table | Query | PK=\<ComplaintID\> | begins_with(SK, "comm#") | |
| Get all complaints for a customer | Customer_Complaint_GSI | Query | customer_id=\<CustomerID\> | | |
| Find complaints escalated to an agent | Escalations_GSI | Query | escalated_to=\<AgentID\> | | |
| View agent's communication history | Agents_Comments_GSI | Query | agentID=\<AgentID\> | | |
| Find complaints by severity and state | Base table | Scan | | | Filter on severity and current_state |
| Track complaint state changes | Base table | Query | PK=\<ComplaintID\> | begins_with(SK, "comm#") | Filter on complaint_state changes |

## Data Model Attributes

- **PK**: Partition key - Complaint ID
- **SK**: Sort key - Either "metadata" or communication identifier
- **customer_id**: ID of the customer who filed the complaint
- **complaint_id**: Unique identifier for the complaint
- **comm_id**: Communication identifier
- **comm_date**: Timestamp of the communication
- **complaint_state**: State of the complaint at the time of communication
- **current_state**: Current state of the complaint (waiting, assigned, investigating, resolved)
- **creation_time**: When the complaint was created
- **severity**: Priority level (P1, P2, P3)
- **complaint_description**: Detailed description of the issue
- **comm_text**: Content of the communication
- **attachments**: Set of S3 URLs for attached files
- **agentID**: ID of the agent handling the communication
- **escalated_to**: ID of the agent to whom the complaint was escalated
- **escalation_time**: When the complaint was escalated

## Example Queries

### Get a specific complaint with all its communications

```javascript
// Get complaint metadata
const complaintMetadata = await docClient.get({
  TableName: 'Complaint_management_system',
  Key: {
    PK: 'Complaint123',
    SK: 'metadata'
  }
}).promise();

// Get all communications for the complaint
const complaintComms = await docClient.query({
  TableName: 'Complaint_management_system',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'Complaint123',
    ':sk': 'comm#'
  }
}).promise();
```

### Get all complaints for a customer

```javascript
const customerComplaints = await docClient.query({
  TableName: 'Complaint_management_system',
  IndexName: 'Customer_Complaint_GSI',
  KeyConditionExpression: 'customer_id = :custId',
  ExpressionAttributeValues: {
    ':custId': 'custXYZ'
  }
}).promise();
```

### Get all escalated complaints for an agent

```javascript
const escalatedComplaints = await docClient.query({
  TableName: 'Complaint_management_system',
  IndexName: 'Escalations_GSI',
  KeyConditionExpression: 'escalated_to = :agentId',
  ExpressionAttributeValues: {
    ':agentId': 'AgentB'
  }
}).promise();
```

## Goals

- Efficiently manage customer complaints and related communications
- Track complaint status changes and escalations
- Enable efficient querying by customer, agent, or escalation status
- Ensure scalability using Amazon DynamoDB's single-table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [ComplaintManagementSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/ComplainManagement/ComplaintManagementSchema.json)

## Design Considerations

1. **Single-Table Design**: All complaint data is stored in a single table to minimize latency and simplify operations.
2. **Chronological Sorting**: Communications are automatically sorted by timestamp due to the SK format.
3. **Flexible Attributes**: The schema accommodates various complaint types and communication formats.
4. **Efficient Querying**: GSIs enable efficient access to data by customer, agent, or escalation status.
5. **Scalability**: The schema is designed to handle a growing number of complaints and communications without performance degradation.
