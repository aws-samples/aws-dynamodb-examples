use dynamodb::model::AttributeValue;

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    // query all Music made by Artist#2
    let artist2 = AttributeValue::S(String::from("Artist#2"));

    // make a consistent query
    let request = client.query()
        .table_name(table_name)
        .key_condition_expression("#pk = :pk")
        .expression_attribute_names("#pk", "Artist")
        .expression_attribute_values(":pk", artist2)
        .consistent_read(true);
    let resp = request.send().await?;

    println!("Query result: {:?}", resp);
    Ok(())
}