#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    // scan the table as 5 segments in parallel
    let segment_count = 5;
    let mut requests = Vec::with_capacity(segment_count);
    for i in 0..segment_count {
        let request = client.scan()
            .table_name(&table_name)
            .total_segments(segment_count as i32)
            .segment(i as i32).send();

        requests.push(request);
    }

    while !requests.is_empty() {
        let request = requests.pop().unwrap();
        let resp = request.await?;
        println!("Segment scan result: {:?}", resp.items);
    }

    Ok(())
}
