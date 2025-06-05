// This is an example of an UpdateCommand using the higher level DocumentClient
// for Amazon DynamoDB. It manipulates an list attribute on an item.

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

async function createItem() {
  // We create the item first so we have a point of reference of the changes.
  const params = {
    TableName: "RetailDatabase",
    Item: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
      name: "Jim Bob",
      favoriteColors: ['red', 'green', 'blue'],
    },
  };
  await docClient.send(new PutCommand(params));
}

async function getFavoriteColors() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    AttributesToGet: ['favoriteColors'], // No reason to get anything else
  };
  const response = await docClient.send(new GetCommand(params));
  return response.Item.favoriteColors.join(', ');
}

async function addYellow() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    UpdateExpression: "SET #fc = list_append(#fc, :colors)",
    ExpressionAttributeNames: {
      "#fc": "favoriteColors",
    },
    ExpressionAttributeValues: {
      ":colors": ["yellow"],
    },
    ReturnValues: "ALL_NEW",
  };

  const response = await docClient.send(new UpdateCommand(params));
  return response.Attributes.favoriteColors.join(', ');
}

async function removeGreen() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    UpdateExpression: "REMOVE #fc[1]",
    ExpressionAttributeNames: {
      "#fc": "favoriteColors",
    },
    ReturnValues: "ALL_NEW",
  };

  const response = await docClient.send(new UpdateCommand(params));
  return response.Attributes.favoriteColors.join(', ');
}

async function swapRedAndBlue() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    UpdateExpression: "SET #fc[0] = #fc[1], #fc[1] = #fc[0]",
    ExpressionAttributeNames: {
      "#fc": "favoriteColors",
    },
    ReturnValues: "ALL_NEW",
  };

  const response = await docClient.send(new UpdateCommand(params));
  return response.Attributes.favoriteColors.join(', ');
}

async function manipulateList() {
  // We are creating the item for a fresh start
  await createItem();

  let favoriteColors = await getFavoriteColors();
  console.log(`These are Jim's favorite colors: ${favoriteColors}`);

  console.log("Yellow is one of Jim's favorite colors as well");
  favoriteColors = await addYellow();
  console.log(`Jim's new favorite colors: ${favoriteColors}`);

  console.log("Green is not one of Jim's favorite colors anymore");
  favoriteColors = await removeGreen();
  console.log(`Jim's new favorite colors: ${favoriteColors}`);

  console.log("Jim had a change of heart and he now likes blue more than red")
  favoriteColors = await swapRedAndBlue();
  console.log(`Jim's new favorite colors: ${favoriteColors}`);
}

manipulateList()
  .then(() => console.log("Script completed"))
  .catch((error) => console.error(error));
