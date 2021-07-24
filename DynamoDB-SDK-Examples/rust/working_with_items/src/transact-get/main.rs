use dynamodb::model::{AttributeValue, Get, TransactGetItem};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();

    let table_name = String::from("Music");

    // read 2 items in a single tx get request
    let get1 = Get::builder().table_name(&table_name)
        .key(String::from("Artist"), AttributeValue::S(String::from("No One You Know")))
        .key(String::from("SongTitle"), AttributeValue::S(String::from("Call Me Today")))
        .build();
    let tx_get_1 = TransactGetItem::builder().get(get1).build();

    let get2 = Get::builder().table_name(&table_name)
        .key(String::from("Artist"), AttributeValue::S(String::from("Acme Band")))
        .key(String::from("SongTitle"), AttributeValue::S(String::from("Happy Day")))
        .build();
    let tx_get_2 = TransactGetItem::builder().get(get2).build();

    let request = client
        .transact_get_items()
        .transact_items(tx_get_1)
        .transact_items(tx_get_2);
    let resp = request.send().await?;

    println!("Tx get items: {:?}", resp);
    Ok(())
}
