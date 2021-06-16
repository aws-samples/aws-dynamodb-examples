use std::collections::HashMap;

use dynamodb::model::{AttributeValue, KeysAndAttributes};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");

    // read 2 items in a single batch get request
    let mut key1 = HashMap::new();
    key1.insert(String::from("Artist"), AttributeValue::S(String::from("No One You Know")));
    key1.insert(String::from("SongTitle"), AttributeValue::S(String::from("Call Me Today")));

    let mut key2 = HashMap::new();
    key2.insert(String::from("Artist"), AttributeValue::S(String::from("Acme Band")));
    key2.insert(String::from("SongTitle"), AttributeValue::S(String::from("Happy Day")));

    let keys_attributes = KeysAndAttributes::builder()
        .keys(key1).keys(key2)
        .consistent_read(true)
        .build();

    let request = client
        .batch_get_item()
        .request_items(&table_name, keys_attributes);
    let resp = request.send().await?;

    println!("Batch get items: {:?}", resp);
    Ok(())
}
