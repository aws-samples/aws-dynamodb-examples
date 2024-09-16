#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    let mut last_evaluated_key = None;

    // scan the table 1 items at a time
    loop {
        let request = client.scan()
            .table_name(&table_name)
            .set_exclusive_start_key(last_evaluated_key)
            .limit(1);
        let resp = request.send().await?;

        last_evaluated_key = resp.last_evaluated_key;
        if last_evaluated_key.is_none() {
            // nothing is scanned in this iteration. we have reached the end.
            break;
        }

        println!("Scanned 1 item: {:?}", resp.items);
    }

    Ok(())
}
