use dynamodb::model::AttributeValue;

#[tokio::main]
async fn main() -> Result<(), dynamodb::Error> {
    let client = dynamodb::Client::from_env();
    let table_name = String::from("Music");

    for artist_idx in 0..10 {
        for song_idx in 0..10 {
            let artist = AttributeValue::S(format!("Artist#{}", artist_idx));
            let song_title = AttributeValue::S(format!("Song#{}", song_idx));
            let album_title = AttributeValue::S(format!("Album#{}", artist_idx * song_idx));

            let awards = AttributeValue::N(String::from("0"));
            let released = AttributeValue::Bool(song_idx % 2 == 0);

            let request = client
                .put_item()
                .table_name(&table_name)
                .item("Artist", artist)
                .item("SongTitle", song_title)
                .item("AlbumTitle", album_title)
                .item("Awards", awards)
                .item("Released", released);

            request.send().await?;
        }
    }

    Ok(())
}
