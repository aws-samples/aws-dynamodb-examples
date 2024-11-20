# Session Management Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB 

## Key Entities

1. customer
2. session

## Design Approach

We employ a single table design with the following key structure:

- Partition Key (PK): Identifies the key entity type (u#<userID> for user, p#<postID> for post) and optionally, a second # followed by a descriptor of what is stored in the partition. 
  - u#\<userID\> - Given user
  - u#\<userID\>#follower - Given user's followers
  - u#\<userID\>#following - The users that the given user is following
  - u#\<userID\>#post - Given user's posts
  - p#\<postID\>#likelist - The users that have liked the given post
  - p#\<postID\>#likecount - The count of the given post's likes
  - u#\<userID\>#timeline - Given user's timeline

- Sort Key (SK): Contains the ID of an entity in the Partition Key collection 
    **or** 
  a descriptor of the attributes ("count", "info") for the primary key of \<PK\>\<SK\>

    - Examples:  

      | PK | SK | Sample Attributes |
      | ----------- | ----------- | ----------- |
      | u#12345 | `count` | follower#, following#, post# |
      | u#12345 | `info` | name, content, imageUrl |
      | u#12345#follower | u#34567 ||
      | u#12345#following | u#34567 ||
      | u#12345#post | p#12345 | content, imageUrl, timestamp |
      | p#12345#likelist | u#34567 ||
      | p#12345#likecount | `count` | etc |
      | u#12345#timeline | p#34567#u#56789 | ttl |


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
  | getLastLoginTimeByCustomerId | GSI | Query | SK=\<customer_id\> | | |
  | getSessionIdByCustomerId | GSI | Query | SK=\<customer_id\> | PK=session_id | |
  | getSessionsByCustomerId | GSI | Query | SK=\<customer_id\> | | |

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure. [SocialNetworkSchema.json](https://github.com/aws-samples/aws-dynamodb-examples/blob/master/schema_design/SchemaExamples/SocialNetwork/SocialNetworkSchema.json)

## Additional Information
[Social network schema design in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-schema-social-network.html)
