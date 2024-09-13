use dynamodb::model::AttributeValue;

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");

    let artist = AttributeValue::S(String::from("No One You Know"));    // hash key
    let song_title = AttributeValue::S(String::from("Call Me Today"));  // range key

    let request = client.get_item()
        .table_name(table_name)
        .key("Artist", artist)
        .key("SongTitle", song_title)
        .consistent_read(true);
    let resp = request.send().await?;

    println!("Get Item: {:?}", resp.item);
    Ok(())
}
