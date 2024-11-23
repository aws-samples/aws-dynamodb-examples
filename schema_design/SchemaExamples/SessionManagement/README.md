# Session Management Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB as a session store. DynamoDB allows for distributed session management in a fast and scalable way. It is easy to setup and can be shared for single-sign-on platforms rather than maintaining separate stores locally. The most typical access patterns for a session store are to create an entry for customer-initiated session, look up sessions initiated by a customer, list all child sessions for a session and get the last login time for a customer.

## Key Entities

1. customer
2. session (A session may have child sessions.)

## Design Approach

We employ a single table design coupled with a global secondary index (GSI). 
The following key structures are used:

  - Base table 
    - Partition key (PK)
      - suuid#\<session UUID\> - Given session
    - Sort key (SK)
      - c#\<customerId\> - Given customer
      - child#suuid\<session UUID\> - Given child session
    - Examples:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | suuid#c342etj3 | c#ABC | last_login_time, access_token, session_state |
      | suuid#c342etj3 | child#suuid#ert54fbgn | access_token, session_state |
      | suuid#c342etj3 | child#suuid#kljhfyf23 | access_token, session_state |

  - GSI (Keys are inverse of base table.)
    - Partition key (PK)
      - c#\<customerId\> - Given customer
      - child#suuid\<session UUID\> - Given child session
    - Sort key (SK)
      - suuid#\<session UUID\> - Given session

    - Examples:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | child#suuid#ert54fbgn | suuid#c342etj3 | access _token, session_state |
      | child#suuid#kljhfyf23 | suuid#c342etj3 | access _token, session_state |
      | c#ABC | suuid#c342etj3 | last_login_time, access_token, session_state |


## Access Patterns

The document covers 8 access patterns. For each access pattern, we provide:
- Usage of Base table or GSI
- Relevant DynamoDB operation (PutItem, GetItem, DeleteItem, Query)
- Partition and Sort key values
- Other conditions or filters

  | Access pattern | Base table/GSI | Operation | Partition key value | Sort key value | Other conditions/Filters |
  | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
  | createSession | Base table | PutItem | PK=\<session_id\> | SK=customer_id | |
  | getSessionBySessionId | Base table | GetItem | PK=\<session_id\> | SK=customer_id | |
  | expireSession | Base table | DeleteItem | PK=\<session_id\> | SK=customer_id | |
  | getChildSessionsBySessionId | Base table | Query | PK=\<session_id\> | SK=customer_id | |
  | getSessionByChildSessionId | GSI | Query | SK=\<child_session_id\> | SK begins_with “child#” | |
  | getLastLoginTimeByCustomerId | GSI | Query | SK=\<customer_id\> | | Limit 1 |
  | getSessionIdByCustomerId | GSI | Query | SK=\<customer_id\> | PK=session_id | |
  | getSessionsByCustomerId | GSI | Query | SK=\<customer_id\> | | |
  
Please note: We add “Limit 1” for getLastLoginTimeByCustomerId since GSIs can have duplicate values. GSIs do not enforce uniqueness on key attribute values like the base table does.

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [SocialNetworkSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/SocialNetwork/SocialNetworkSchema.json)

## Additional Information
[Social network schema design in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-schema-social-network.html)
