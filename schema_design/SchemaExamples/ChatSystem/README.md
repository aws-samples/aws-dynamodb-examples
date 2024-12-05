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

The document covers 9 access patterns. For each access pattern, we provide:
- Usage of Base table or GSI
- Relevant DynamoDB operation (PutItem, GetItem, DeleteItem, Query)
- Partition and Sort key values
- Other conditions or filters

  | Access pattern | Base table/GSI | Operation | Partition key value | Sort key value | Other conditions/Filters |
  | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
  | createChatRoom | Base table | PutItem | PK=\<RoomID\> | SK="Meta" | if not exists |
  | deleteChatRoom | Base table | DeleteItem | PK=\<RoomID\> | SK="Meta" | createdBy=UserID |
  | joinChatRoom | Base table | PutItem | PK=\<UserID\> | SK="Join" + RoomID | |
  | leaveChatRoom | Base table | DeleteItem | PK=\<UserID\> | SK="Join" + RoomID | |
  | addComments | Base table | PutItem | PK=\<UserID\> | SK=timestammp | |
  | getAllComments | GSI | Query | PK=\<RoomID\> | | Limit 1 |
  | getLatestComments | GSI | Query | PK=\<RoomID\> | | Limit 10 & ScanIndexForward = false |
  | getFromLatestToSpecifiedPositionComments | GSI | Query | PK=\<RoomID\> | SK > FromPosition | |
  | getFromPositionToPositionComments | GSI | Query | PK=\<RoomID\>  | SK between FromPosition and ToPosition | |

  
Please note: We add “Limit 1” for getLastLoginTimeByCustomerId since GSIs can have duplicate values. GSIs do not enforce uniqueness on key attribute values like the base table does.

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [ChatSystemSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/ChatSystem/ChatSystemSchema.json)
