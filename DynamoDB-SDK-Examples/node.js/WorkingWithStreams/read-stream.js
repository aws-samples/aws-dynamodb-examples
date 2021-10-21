
// A naive DynamoDB Stream reader that reads from the stream and prints the records to the console.
const AWS = require('aws-sdk');

const ddbStreams = new AWS.DynamoDBStreams({
  region: 'us-west-2'
});

const REGION = "us-west-2";
const TableName = "<your-table-name>";
const AccountNumber = "<your-aws-account-number>";
const StreamId = "2021-10-21T15:22:50.200";

const streamArn = `arn:aws:dynamodb:${REGION}:${AccountNumber}:table/${TableName}/stream/${StreamId}`;

const streamReader = async () => {
  let lastEvaluatedShardId;

  do {
    // Get stream Description
    const { StreamDescription } = await ddbStreams.describeStream({
      StreamArn: streamArn,
      ExclusiveStartShardId: lastEvaluatedShardId,
    }).promise();

    for (let shard of StreamDescription.Shards) {
      const { ShardIterator } = await ddbStreams.getShardIterator({
        StreamArn: streamArn,
        ShardId: shard.ShardId,
        ShardIteratorType: 'TRIM_HORIZON' // Read from the oldest event of the shard
      }).promise();

      let currentShardIterator = ShardIterator;

      // Loop until shardIterator is null, which doesn't happen until shard is closed which may be in hours.
      // A more advanced solution would store a checkpoint if shard doesn't have an end to
      // its 'SequenceNumberRange' and come back to this later or read from the shards in parallel to prevent blocking.
      while (currentShardIterator) {
        const { Records, NextShardIterator } = await ddbStreams.getRecords({
          ShardIterator: currentShardIterator
        }).promise();

        currentShardIterator = NextShardIterator;
        for (let record of Records) {
          console.log(record);
        }
      }
    }
    // Loop as long as lastEvaluatedShardId is not null as there's at least one more page of shards
  } while (lastEvaluatedShardId);
}

streamReader()
  .catch((error) => console.log("An error occurred reading from the stream: " + error.message ));