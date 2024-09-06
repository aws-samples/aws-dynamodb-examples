use dynamodb::model::AttributeValue;

// put an item if it does not already exist
// run this example twice to get a conditional put failure
#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");
    let artist = AttributeValue::S(String::from("No One You Know"));
    let song_title = AttributeValue::S(String::from("Call Me Today"));
    let album_title = AttributeValue::S(String::from("Somewhat Famous"));
    let awards = AttributeValue::N(String::from("0"));
    let released = AttributeValue::Bool(false);

    let request = client
        .put_item()
        .table_name(table_name)
        .item("Artist", artist)
        .item("SongTitle", song_title)
        .item("AlbumTitle", album_title)
        .item("Awards", awards)
        .item("Released", released)
        .condition_expression(String::from("attribute_not_exists(Artist)"));

    let _resp = request.send().await?;

    println!("Item is inserted");
    Ok(())
}
