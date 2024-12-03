# Chat System Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB .

## Key Entities

1. user
2. room

## Design Approach

We employ a single table design coupled with a global secondary index (GSI). 
The following key structures are used:

  - Base table 
    - Partition key (PK)
      - User:\<userID\> - Given User
      - Room:\<roomID\> - Given Room
    - Sort key (SK)
      - <\timestamp\> -
      - "meta" - 

    - Examples:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | User:UserA | 2023-04-01T14:00:00.001Z | RoomID, Comment, CreatedAt |
      | Room:Art | meta | CreatedBy |

  - GSI
    - Partition key (RoomID)
      - c#\<customerId\> - Given customer
    - Sort key (CreatedAt)
      - RoomID#\<session UUID\> - Given session of partition key (customer or child session)

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
  | getChildSessionsBySessionId | Base table | Query | PK=\<session_id\> | SK begins_with “child#”| |
  | getSessionByChildSessionId | GSI | Query | SK=\<child_session_id\> | SK begins_with “child#” | |
  | getLastLoginTimeByCustomerId | GSI | Query | SK=\<customer_id\> | | Limit 1 |
  | getSessionIdByCustomerId | GSI | Query | SK=\<customer_id\> | PK=session_id | |
  | getSessionsByCustomerId | GSI | Query | SK=\<customer_id\> | | |
  
Please note: We add “Limit 1” for getLastLoginTimeByCustomerId since GSIs can have duplicate values. GSIs do not enforce uniqueness on key attribute values like the base table does.

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [SessionManagementSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/SessionManagement/SessionManagementSchema.json)
