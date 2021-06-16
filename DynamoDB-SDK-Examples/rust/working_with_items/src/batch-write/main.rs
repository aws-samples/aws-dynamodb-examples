use dynamodb::model::{AttributeValue, PutRequest, ReturnConsumedCapacity, WriteRequest};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");

    // put 2 items in a single batch write request
    let artist1 = AttributeValue::S(String::from("No One You Know"));
    let song1 = AttributeValue::S(String::from("Call Me Today"));
    let album1 = AttributeValue::S(String::from("Somewhat Famous"));
    let awards1 = AttributeValue::N(String::from("0"));
    let released1 = AttributeValue::Bool(false);
    let put1 = PutRequest::builder()
        .item(String::from("Artist"), artist1)
        .item(String::from("SongTitle"), song1)
        .item("AlbumTitle", album1)
        .item("Awards", awards1)
        .item("Released", released1)
        .build();
    let write1 = WriteRequest::builder().put_request(put1).build();

    let artist2 = AttributeValue::S(String::from("Acme Band"));
    let song2 = AttributeValue::S(String::from("Happy Day"));
    let album2 = AttributeValue::S(String::from("Songs About Life"));
    let awards2 = AttributeValue::N(String::from("10"));
    let released2 = AttributeValue::Bool(true);
    let put2 = PutRequest::builder()
        .item(String::from("Artist"), artist2)
        .item(String::from("SongTitle"), song2)
        .item("AlbumTitle", album2)
        .item("Awards", awards2)
        .item("Released", released2)
        .build();
    let write2 = WriteRequest::builder().put_request(put2).build();

    let request = client
        .batch_write_item()
        .request_items(&table_name, vec![write1, write2])
        .return_consumed_capacity(ReturnConsumedCapacity::Total);
    let resp = request.send().await?;

    println!("Batch write items: {:?}", resp);
    Ok(())
}
