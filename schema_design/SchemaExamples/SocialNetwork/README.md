# Social Network Data Modeling with Amazon DynamoDB

## Overview

This document outlines a detailed data modeling and schema design approach for a "Social Network" use case using Amazon DynamoDB. The model 
supports a system where users can interact with a social network where they can create posts, follow other users, like other user's posts, 
view other users following them, view the number of likes a post has, view users who liked a post, and view their timeline. 

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
  - u#\<userID\>#timeline - Given user's timeline
  - p#\<postID\>#likelist - The users that have liked the given post
  - p#\<postID\>#likecount - The count of the given posts likes

- Sort Key (SK): Contains the ID(s) of entities related to the Partition Key (u#\<userID\> for user, p#\<postID\> for post, p#\<postID\>#u#\<userID\> for a post by a user) or an attribute descriptor ("count", "info")

## Access Patterns

The document covers 7 access patterns. For each access pattern, we provide:
- Specific PK and SK used
- Relevant DynamoDB operations (GetItem, Query)

| Access pattern | Operation | Partition key value | Sort key value }
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
