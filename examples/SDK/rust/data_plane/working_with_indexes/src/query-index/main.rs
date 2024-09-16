use dynamodb::model::AttributeValue;

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");
    let index_name = String::from("AlbumIndex");

    // query all Songs in Album#2
    let album2 = AttributeValue::S(String::from("Album#2"));

    // make a consistent query
    let request = client.query()
        .table_name(table_name)
        .index_name(index_name)
        .key_condition_expression("#pk = :pk")
        .expression_attribute_names("#pk", "AlbumTitle")
        .expression_attribute_values(":pk", album2);
    let resp = request.send().await?;

    println!("Query result: {:?}", resp);
    Ok(())
}
