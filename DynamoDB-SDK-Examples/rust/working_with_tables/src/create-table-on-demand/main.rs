use dynamodb::model::{AttributeDefinition, BillingMode, KeySchemaElement, KeyType,
                      ScalarAttributeType};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");
    let hash_key = String::from("Artist");
    let range_key = String::from("SongTitle");

    let hash_key_schema = KeySchemaElement::builder()
        .attribute_name(&hash_key)
        .key_type(KeyType::Hash)
        .build();
    let range_key_schema = KeySchemaElement::builder()
        .attribute_name(&range_key)
        .key_type(KeyType::Range)
        .build();

    let hash_key_attribute = AttributeDefinition::builder()
        .attribute_name(String::from(&hash_key))
        .attribute_type(ScalarAttributeType::S)
        .build();
    let range_key_attribute = AttributeDefinition::builder()
        .attribute_name(String::from(&range_key))
        .attribute_type(ScalarAttributeType::S)
        .build();

    let resp = client.create_table()
        .table_name(table_name)
        .key_schema(hash_key_schema)
        .key_schema(range_key_schema)
        .attribute_definitions(hash_key_attribute)
        .attribute_definitions(range_key_attribute)
        .billing_mode(BillingMode::PayPerRequest)
        .send()
        .await?;
    println!("Created DynamoDB table: {:?}", resp.table_description);
    Ok(())
}
