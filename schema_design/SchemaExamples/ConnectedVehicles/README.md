# Connected Vehicles Data Modeling with Amazon DynamoDB

## Overview

This document outlines a detailed data modeling and schema design approach for a "Connected Vehicles" use case using Amazon DynamoDB. The model supports a system where vehicle manufacturers can offer various features and functionalities as subscriptions for users to enable.

## Key Entities

1. Vehicle
2. Features
3. User (Customer)
4. Preferences

## Design Approach

We employ a single table design with the following key structure:

- Partition Key (PK): Identifies the entity type (e.g., VIN# for vehicles, ID# for users)
- Sort Key (SK): Organizes data within each entity

## Access Patterns

The document covers 22 key access patterns, including but not limited to:

- Creating and retrieving vehicles
- Managing user preferences
- Linking users to vehicles
- Managing subscriptions

For each access pattern, we provide:
- Specific PK and SK used
- Relevant DynamoDB operations (PutItem, Query, UpdateItem, DeleteItem, BatchWriteItem)

## Goals

- Model relationships between vehicles, features, and user preferences efficiently
- Ensure scalability using Amazon DynamoDB's single table design principles

## Schema Design

A comprehensive schema design is included, demonstrating how different entities and access patterns map to the DynamoDB table structure.
