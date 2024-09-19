import { nanoid } from "nanoid";
import express from "express";
import bodyParser from "body-parser";
import {
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import cors from "cors";

const TableName = "Tasks";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  response.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  next();
});

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "DUMMY0ACCESS0KEY0ID",
    secretAccessKey: "DUMMY0SECRET0ACCESS0KEY", //pragma: allowlist secret
  },
});

app.get("/api/tasks", async (request, response) => {
  const scanParams = {
    TableName,
  };

  try {
    const data = await client.send(new ScanCommand(scanParams));
    const items = data.Items.map((item) => unmarshall(item));
    console.log("Scan succeeded. Items:", JSON.stringify(items, null, 2));
    response.json(items);
  } catch (error) {
    console.error(
      "Unable to scan table. Error JSON:",
      JSON.stringify(error, null, 2),
    );
    response.status(500).json(error);
  }
});

app.post("/api/task", async (request, response) => {
  //   const note = {
  //     PK: { S: nanoid() },
  //     text: { S: request.body.text },
  //   };
  const { title, description } = request.body;
  const note = {
    PK: nanoid(),
    title,
    description,
  };
  const params = {
    TableName,
    Item: marshall(note),
  };

  try {
    const data = await client.send(new PutItemCommand(params));
    console.log("Added item:", JSON.stringify(data, null, 2));
    response
      .status(201)
      .header("Location", `/api/task/${note.PK}`)
      .json({ message: "Task created successfully", data });
  } catch (error) {
    console.error(
      "Unable to add item. Error JSON:",
      JSON.stringify(err, null, 2),
    );
    response.status(500).json({ message: "Error creating task", error });
  }
});

app.delete("/api/task/:id", async (request, response) => {
  const { id } = request.params;
  const params = {
    TableName,
    Key: marshall({ PK: id }),
  };

  try {
    const data = await client.send(new DeleteItemCommand(params));
    response.status(200).json({ message: "Task deleted successfully", data });
  } catch (error) {
    response.status(500).json({ message: "Error deleting task", error });
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
