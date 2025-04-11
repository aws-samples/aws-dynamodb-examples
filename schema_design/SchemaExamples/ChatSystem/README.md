# Chat System Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB as a datastore for a chat system. For example, it is intended to be used within a team of several people in a game, or in a live video streaming situation where comments are added to the video. The flow of the system is as follows: create a room, join a room, speak in a room, leave a room, and delete a room.

## Key Entities

1. user
2. room
3. comment

## Design Approach

We employ a single table design coupled with a global secondary index (GSI). 
The following key structures are used:

  - Base table 
    - For a user item:
      - Partition key (PK)
        - User:\<UserID\>
      - Sort key (SK)
        - \<timestamp\>
    - For a room item:
      - Partition key (PK)
        - Room:\<RoomID\>
      - Sort key (SK)
        - "meta"

    - Examples:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | User:UserA | 2023-04-01T14:00:00.001Z | RoomID, Comment, CreatedAt |
      | Room:Art | `meta` | CreatedBy |

  - GSI
    - Partition key (RoomID)
      - \<RoomID\>
    - Sort key (CreatedAt)
      - \<timestamp\>

    - Example:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | Music | 2023-04-01T12:00:00.001Z | PK, SK, Comment |


## Access Patterns

The document covers 9 access patterns. For each access pattern, we provide:
- Usage of Base table or GSI
- Relevant DynamoDB operation (PutItem, DeleteItem, Query)
- Partition and Sort key values
- Other conditions or filters

  | Access pattern | Base table/GSI | Operation | Partition key value | Sort key value | Other conditions/Filters |
  | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
  | createChatRoom | Base table | PutItem | PK=\<RoomID\> | SK="meta" | if not exists |
  | deleteChatRoom | Base table | DeleteItem | PK=\<RoomID\> | SK="meta" | CreatedBy=\<UserID\> |
  | joinChatRoom | Base table | PutItem | PK=\<UserID\> | SK="Join:"\<roomID\>  | |
  | leaveChatRoom | Base table | DeleteItem | PK=\<UserID\> | SK="Join:"\<roomID\>  | |
  | addComments | Base table | PutItem | PK=\<UserID\> | SK=\<timestamp\> | |
  | getAllComments | GSI | Query | PK=\<RoomID\> | | Limit 1 |
  | getLatestComments | GSI | Query | PK=\<RoomID\> | | Limit 10 & ScanIndexForward = false |
  | getFromLatestToSpecifiedPositionComments | GSI | Query | PK=\<RoomID\> | SK > \<FromPosition\> | |
  | getFromPositionToPositionComments | GSI | Query | PK=\<RoomID\>  | SK between \<FromPosition\> and \<ToPosition\> | |

  
Please note: We add “Limit 1” for getAllComments since GSIs can have duplicate values. GSIs do not enforce uniqueness on key attribute values like the base table does.

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [ChatSystemSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/ChatSystem/ChatSystemSchema.json)
