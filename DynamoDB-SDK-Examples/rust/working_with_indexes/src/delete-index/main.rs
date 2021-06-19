use dynamodb::model::{DeleteGlobalSecondaryIndexAction, GlobalSecondaryIndexUpdate};

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    let delete_gsi = DeleteGlobalSecondaryIndexAction::builder().index_name("AlbumIndex").build();
    let gsi_update = GlobalSecondaryIndexUpdate::builder().delete(delete_gsi).build();

    let resp = client.update_table()
        .global_secondary_index_updates(gsi_update)
        .table_name(table_name)
        .send()
        .await?;

    println!("Delete Index: {:?}", resp.table_description);
    Ok(())
}
