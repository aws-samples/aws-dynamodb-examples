use dynamodb::model::{AttributeDefinition, CreateGlobalSecondaryIndexAction,
                      GlobalSecondaryIndexUpdate, KeySchemaElement, KeyType, Projection,
                      ProjectionType, ScalarAttributeType};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    // create a GSI with AlbumTitle as hash key and song title as range key
    // so that we can query all songs in an album
    let hash_key = String::from("AlbumTitle");
    let hash_key_schema = KeySchemaElement::builder()
        .attribute_name(&hash_key)
        .key_type(KeyType::Hash)
        .build();
    let hash_key_attribute = AttributeDefinition::builder()
        .attribute_name(String::from(&hash_key))
        .attribute_type(ScalarAttributeType::S)
        .build();

    let range_key = String::from("SongTitle");
    let range_key_schema = KeySchemaElement::builder()
        .attribute_name(&range_key)
        .key_type(KeyType::Range)
        .build();
    let range_key_attribute = AttributeDefinition::builder()
        .attribute_name(String::from(&range_key))
        .attribute_type(ScalarAttributeType::S)
        .build();

    let projection = Projection::builder().projection_type(ProjectionType::All).build();
    let create_gsi = CreateGlobalSecondaryIndexAction::builder()
        .index_name("AlbumIndex")
        .key_schema(hash_key_schema)
        .key_schema(range_key_schema)
        .projection(projection)
        .build();
    let gsi_update = GlobalSecondaryIndexUpdate::builder().create(create_gsi).build();

    let resp = client.update_table()
        .global_secondary_index_updates(gsi_update)
        .table_name(table_name)
        .attribute_definitions(hash_key_attribute)
        .attribute_definitions(range_key_attribute)
        .send()
        .await?;

    println!("Creating Online Index: {:?}", resp.table_description);
    Ok(())
}
