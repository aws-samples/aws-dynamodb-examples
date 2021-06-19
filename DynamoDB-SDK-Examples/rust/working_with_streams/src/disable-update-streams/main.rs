use dynamodb::model::{StreamSpecification, StreamViewType};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    let stream_specification = StreamSpecification::builder()
        .stream_enabled(false)
        .build();

    let resp = client.update_table()
        .table_name(table_name)
        .stream_specification(stream_specification)
        .send()
        .await?;

    println!("Disabling Update Streams: {:?}", resp.table_description);
    Ok(())
}
