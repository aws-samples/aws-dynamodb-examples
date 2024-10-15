
# Connected Vehicles

Scope of this document a detailed data modeling and schema design approach for a "Connected Vehicles" use case using Amazon DynamoDB.
The document involves connected vehicles where manufacturers can offer different features/functionality as subscriptions for users to enable.
We describe a data model consisting of four main entities - Vehicle, Features, User (Customer), and Preferences.
We describe a single table design approach, where the Partition Key (PK) identifies the entity type (VIN# for vehicles, ID# for users) and the Sort Key (SK) organizes the data within each entity.
The document walks through 22 key access patterns that need to be supported, such as creating/retrieving vehicles, managing user preferences, linking users to vehicles, and managing subscriptions.
For each access pattern, the document covers the specific PK and SK used, as well as the relevant DynamoDB operations (PutItem, Query, UpdateItem, DeleteItem, BatchWriteItem).
The goal is to model the relationships between vehicles, features, and user preferences in an efficient and scalable way using Amazon DynamoDB's single table design principles.
A final schema design is provided, showing how the different entities and access patterns are mapped to the DynamoDB table structure.
