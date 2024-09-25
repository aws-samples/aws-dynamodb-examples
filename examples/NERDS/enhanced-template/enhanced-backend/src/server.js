import { nanoid } from "nanoid";
import express from "express";
import bodyParser from "body-parser";
import {
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  DeleteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import cors from "cors";

const TableName = "social-recipes";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  response.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
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

app.post("/api/user/:userId/task", async (request, response) => {
  const { title, description, taskPriority } = request.body;
  const taskId = nanoid();
  const taskDate = new Date().toISOString();
  const userId = request.params.userId;

  let sk;
  if (
    taskPriority !== undefined &&
    taskPriority !== null &&
    taskPriority !== ""
  ) {
    sk = `TASK#${taskPriority}#${taskDate}#${taskId}`;
  } else {
    sk = `TASK#${taskDate}#${taskId}`;
  }

  const task = {
    PK: `USER#${userId}`,
    SK: sk,
    title,
    description,
    taskDate,
    userId,
    taskId,
    taskDate,
    isComplete: false,
  };

  if (
    taskPriority !== undefined &&
    taskPriority !== null &&
    taskPriority !== ""
  ) {
    task.taskPriority = taskPriority;
  }

  const params = {
    TableName,
    Item: marshall(task),
  };

  try {
    const data = await client.send(new PutItemCommand(params));
    console.log("Added item:", JSON.stringify(data, null, 2));
    response.status(201).json({
      message: "Task created successfully",
      data,
      taskId,
      taskDate,
      taskPriority,
    });
  } catch (error) {
    console.error(
      "Unable to add item. Error JSON:",
      JSON.stringify(error, null, 2)
    );
    response.status(500).json({ message: "Error creating task", error });
  }
});

app.get("/api/user/:userId", async (request, response) => {
  const { userId } = request.params;

  const queryParams = {
    TableName,
    KeyConditionExpression: "PK = :userId",
    ExpressionAttributeValues: marshall({
      ":userId": "USER#" + userId,
    }),
    ScanIndexForward: false,
  };

  try {
    const data = await client.send(new QueryCommand(queryParams));
    const items = data.Items.map((item) => unmarshall(item));
    console.log("Query succeeded. Items:", JSON.stringify(items, null, 2));
    response.json(items);
  } catch (error) {
    console.error(
      "Unable to query table. Error JSON:",
      JSON.stringify(error, null, 2)
    );
    response.status(500).json(error);
  }
});

// Get only the task from userId
app.get("/api/user/:userId/tasks", async (request, response) => {
  const { userId } = request.params;

  const queryParams = {
    TableName,
    KeyConditionExpression: "PK = :userId AND begins_with(SK, :taskPrefix)",
    ExpressionAttributeValues: marshall({
      ":userId": "USER#" + userId,
      ":taskPrefix": "TASK#",
    }),
  };

  try {
    const data = await client.send(new QueryCommand(queryParams));
    const items = data.Items.map((item) => unmarshall(item));
    console.log("Query succeeded. Items:", JSON.stringify(items, null, 2));
    response.json(items);
  } catch (error) {
    console.error(
      "Unable to query table. Error JSON:",
      JSON.stringify(error, null, 2)
    );
    response.status(500).json(error);
  }
});

// Get only the task with a given priorty from userId
app.get(
  "/api/user/:userId/tasks/taskPriority/:priority",
  async (request, response) => {
    const { userId, taskPriority } = request.params;

    const queryParams = {
      TableName,
      KeyConditionExpression: "PK = :userId AND begins_with(SK, :taskPrefix)",
      ExpressionAttributeValues: marshall({
        ":userId": "USER#" + userId,
        ":taskPrefix": "TASK#" + taskPriority,
      }),
    };

    try {
      const data = await client.send(new QueryCommand(queryParams));
      const items = data.Items.map((item) => unmarshall(item));
      console.log("Query succeeded. Items:", JSON.stringify(items, null, 2));
      response.json(items);
    } catch (error) {
      console.error(
        "Unable to query table. Error JSON:",
        JSON.stringify(error, null, 2)
      );
      response.status(500).json(error);
    }
  }
);

app.patch("/api/user/:userId/task/:taskId", async (request, response) => {
  const { userId, taskId } = request.params;
  const { taskPriority, taskDate } = request.body;
  const isCompleteParam = request.body.isComplete;
  let isComplete;

  if (isCompleteParam === "true" || isCompleteParam === "1") {
    isComplete = true;
  } else if (isCompleteParam === "false" || isCompleteParam === "0") {
    isComplete = false;
  } else {
    return response
      .status(400)
      .json({ message: "isComplete must be 'true', 'false', '1', or '0'" });
  }

  if (!taskDate) {
    return response
      .status(400)
      .json({ message: "taskPriority and taskDate are required" });
  }

  let sk;
  if (taskPriority !== undefined && taskPriority !== null) {
    sk = `TASK#${taskPriority}#${taskDate}#${taskId}`;
  } else {
    sk = `TASK#${taskDate}#${taskId}`;
  }

  try {
    const updateParams = {
      TableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: sk,
      }),
      UpdateExpression: "SET isComplete = :isComplete",
      ExpressionAttributeValues: marshall({
        ":isComplete": isComplete,
      }),
      ReturnValues: "ALL_NEW",
    };

    const { Attributes } = await client.send(
      new UpdateItemCommand(updateParams)
    );

    if (!Attributes) {
      return response.status(404).json({ message: "Task not found" });
    }

    response.json({
      message: "Task updated successfully",
      task: unmarshall(Attributes),
    });
  } catch (error) {
    console.error("Error updating task:", JSON.stringify(error, null, 2));
    response.status(500).json({ message: "Error updating task", error });
  }
});

app.delete("/api/user/:userId/task/:taskId", async (request, response) => {
  const { userId, taskId } = request.params;
  const { taskPriority, taskDate } = request.query;
  console.log(taskDate);
  if (!taskDate) {
    return response.status(400).json({ message: "taskDate is required" });
  }

  let sk;
  if (taskPriority) {
    sk = `TASK#${taskPriority}#${taskDate}#${taskId}`;
  } else {
    sk = `TASK#${taskDate}#${taskId}`;
  }

  const deleteParams = {
    TableName,
    Key: marshall({
      PK: `USER#${userId}`,
      SK: sk,
    }),
    ReturnValues: "ALL_OLD",
  };

  try {
    const { Attributes } = await client.send(
      new DeleteItemCommand(deleteParams)
    );

    if (!Attributes) {
      return response.status(404).json({ message: "Task not found" });
    }

    response.json({
      message: "Task deleted successfully",
      deletedTask: unmarshall(Attributes),
    });
  } catch (error) {
    console.error("Error deleting task:", JSON.stringify(error, null, 2));
    response.status(500).json({ message: "Error deleting task", error });
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
