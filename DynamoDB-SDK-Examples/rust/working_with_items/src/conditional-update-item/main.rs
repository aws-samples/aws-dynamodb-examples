use dynamodb::model::{AttributeValue, ReturnValue};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");
    let artist = AttributeValue::S(String::from("No One You Know"));    // hash key
    let song_title = AttributeValue::S(String::from("Call Me Today"));  // range key

    // increment the "Awards" count by if the current "Released" flag is set to false
    let update_expression = String::from("SET Awards = Awards + :a");
    let condition_expression = String::from("Released = :r");
    let released = AttributeValue::Bool(true);
    let awards_increment = AttributeValue::N(String::from("1"));

    let request = client
        .update_item()
        .table_name(table_name)
        .key("Artist", artist)
        .key("SongTitle", song_title)
        .update_expression(update_expression)
        .condition_expression(condition_expression)
        .expression_attribute_values(String::from(":r"), released)
        .expression_attribute_values(String::from(":a"), awards_increment)
        .return_values(ReturnValue::AllNew);
    let resp = request.send().await?;

    println!("Item is updated. New item: {:?}", resp.attributes);
    Ok(())
}
