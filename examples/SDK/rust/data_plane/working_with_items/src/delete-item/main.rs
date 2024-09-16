use dynamodb::model::{AttributeValue, ReturnValue};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");
    let artist = AttributeValue::S(String::from("No One You Know"));    // hash key
    let song_title = AttributeValue::S(String::from("Call Me Today"));  // range key


    let request = client
        .delete_item()
        .table_name(table_name)
        .key("Artist", artist)
        .key("SongTitle", song_title)
        .return_values(ReturnValue::AllOld);
    let resp = request.send().await?;

    println!("Item is deleted. Deleted item: {:?}", resp.attributes);
    Ok(())
}
