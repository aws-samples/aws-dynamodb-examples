use dynamodb::model::AttributeValue;

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    // query all released Music made by Artist#2
    let artist2 = AttributeValue::S(String::from("Artist#2"));
    let released = AttributeValue::Bool(true);

    // make a consistent query
    let request = client.query()
        .table_name(table_name)
        .key_condition_expression("#pk = :pk")
        .filter_expression("#r = :r")
        .expression_attribute_names("#pk", "Artist")
        .expression_attribute_values(":pk", artist2)
        .expression_attribute_names("#r", "Released")
        .expression_attribute_values(":r", released)
        .consistent_read(true);
    let resp = request.send().await?;

    println!("Query scanned {:?} items and returned {:?} items", resp.scanned_count, resp.count);
    println!("Query items: {:?}", resp.items);

    Ok(())
}