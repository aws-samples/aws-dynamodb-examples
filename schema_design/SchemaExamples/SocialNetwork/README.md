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

- Partition Key (PK): Identifies the key entity type (u#<userID> for users, p#<postID> for posts) and optionally a second # followed by a descriptor of what is stored in the partition. 
- u#\<userID\>
- u#\<userID\>#follower - Given user's followers
- u#\<userID\>#following - The users that the given user is following
- u#\<userID\>#post - Given user's posts
- u#\<userID\>#timeline - Given user's timeline
- p#\<postID\>#likelist - The users that have liked the given post
- p#\<postID\>#likecount - The count of the given posts likes

- Sort Key (SK): Contains the ID(s) of related entities (u#<userID> for users, p#<postID> for posts, p#<postID>#u#<userID> for posts by a user)   

## Access Patterns

The document covers 7 access patterns:

- Get user information for a given userID
- Get follower list for a given userID
- Get following list for a given userID
- Get post list for a given userID
- Get user list who likes the post for a given postID
- Get the like count for a given postID
- Get the timeline for a given userID

For each access pattern, we provide:
- Specific PK and SK used
- Relevant DynamoDB operations (PutItem, Query, UpdateItem, DeleteItem, BatchWriteItem)

## Goals

- Model relationships between users and posts efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure.
