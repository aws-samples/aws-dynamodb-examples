# Social Network Data Modeling with Amazon DynamoDB

## Overview

This document outlines a use case using DynamoDB as a social network. A social network is an online service that lets different users interact with each other. The social network we'll design will let the user see a timeline consisting of their posts, their followers, who they are following, and the posts written by who they are following.

## Key Entities

1. user
2. post

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
      | u#12345 | "count" | follower#, following#, post# |
      | u#12345 | "info" | name, content, imageUrl |
      | u#12345#follower | u#34567 ||
      | u#12345#following | u#34567 ||
      | u#12345#post | p#12345 | content, imageUrl, timestamp |
      | p#12345#likelist | u#34567 ||
      | p#12345#likecount | "count" | etc |
      | u#12345#timeline | p#34567#u#56789 | ttl |


## Access Patterns

The document covers 7 access patterns. For each access pattern, we provide:
- Specific PK and SK used
- Relevant DynamoDB operation (GetItem, Query)

| Access pattern | Operation | Partition key value | Sort key value |
| ----------- | ----------- | ----------- | ----------- |
| getUserInfoByUserID | Query | PK=\<userID\> |
| getFollowerListByUserID | Query | PK=\<userID\>#follower |
| getFollowingListByUserID | Query | PK=\<userID\>#following | 
| getPostListByUserID | Query | PK=\<userID\>#post |
| getUserLikesByPostID | Query | PK=\<postID\>#likelist |
| getLikeCountByPostID | GetItem | PK=\<postID\>#likecount |
| getTimelineByUserID | Query | PK=\<userID\>#timeline |

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure.

## Additional Information
![Social network schema design in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-schema-social-network.html)
