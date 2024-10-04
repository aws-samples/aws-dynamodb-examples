import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const tableName = "social-recipes";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "DUMMY0ACCESS0KEY0ID",
    secretAccessKey: "DUMMY0SECRET0ACCESS0KEY", //pragma: allowlist secret
  },
});

const items = [
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "USER#4Rl17WTewD6aa1-k73cBJ",
    Priorities: [0, 1, 2, 3],
    Name: "John Doe",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#2024-09-21T10:57:01#o5-Y6L4cyBdZUWE4a5U2a",
    title: "Get some onions",
    description: "We are cooking some seviche, it needs purple onions",
    taskDate: "2024-09-21T10:57:01",
    taskId: "o5-Y6L4cyBdZUWE4a5U2a",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#2024-09-21T10:04:51#bT_-eE-I2XMEhs-qNltOS",
    title: "Complete assignment",
    description: "This extra ssignment will give me 10 points",
    taskId: "bT_-eE-I2XMEhs-qNltOS",
    taskDate: "2024-09-21T10:04:51",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#2024-09-21T10:51:47#45iOrKCdW7ppFYOx1eTWR",
    title: "Is it raining in mars",
    description: "Investigate if there is water in mars",
    taskId: "45iOrKCdW7ppFYOx1eTWR",
    taskDate: "2024-09-21T10:51:47",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#0#2024-09-21T10:35:39#hUkIVS7H3BKlEmQTNvNOe",
    taskPriority: "0",
    title: "Get some Corvina",
    description: "Corvina is the best for a seviche",
    taskId: "hUkIVS7H3BKlEmQTNvNOe",
    taskDate: "2024-09-21T10:35:39",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#0#2024-09-21T12:16:26#V9HbF9Edu2NdnkrY6PcCk",
    taskPriority: "0",
    title: "Chili flakes",
    description: "This will really give the seviche that kick!",
    taskId: "V9HbF9Edu2NdnkrY6PcCk",
    taskDate: "2024-09-21T12:16:26",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
  {
    PK: "USER#4Rl17WTewD6aa1-k73cBJ",
    SK: "TASK#1#2024-09-21T10:40:29#qytMVJUgUK3I0TlC--G9y",
    taskPriority: "1",
    title: "Get mangos",
    description:
      "The mango should not be very ripe, try something in the middle",
    taskId: "qytMVJUgUK3I0TlC--G9y",
    taskDate: "2024-09-21T10:40:29",
    userId: "4Rl17WTewD6aa1-k73cBJ",
  },
];
const batchInsertItems = async (items) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [tableName]: chunk.map((item) => ({
          PutRequest: { Item: marshall(item) },
        })),
      },
    };

    try {
      const command = new BatchWriteItemCommand(params);
      await client.send(command);
      console.log(`Successfully inserted batch of ${chunk.length} items`);
    } catch (error) {
      console.error("Error inserting batch:", error);
    }
  }
};

batchInsertItems(items)
  .then(() => {
    console.log("All items have been processed");
  })
  .catch((error) => {
    console.error("An error occurred during batch insertion:", error);
  });