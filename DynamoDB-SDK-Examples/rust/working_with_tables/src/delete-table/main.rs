#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    let resp = client.delete_table()
        .table_name(&table_name)
        .send().await?;
    println!("Table is deleted: {:?}", resp.table_description);
    Ok(())
}
