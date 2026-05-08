import {
  BatchGetItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand as NativeQueryCommand,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { MARSHALL_OPTS } from "./ddbMarshalling.mjs";
import { mapTransactItemsToNative } from "./ddbLowLevelTransactItems.mjs";

/** @param {ReturnType<typeof import("./ddbRuntime.mjs").createDdbRuntime>} rt */
export async function sendGetCommand(rt, input) {
  if (!rt.isLowLevel) {
    return rt.doc.send(new GetCommand(input));
  }
  const out = await rt.lowLevel.send(
    new GetItemCommand({
      TableName: input.TableName,
      Key: marshall(input.Key, MARSHALL_OPTS),
      ConsistentRead: input.ConsistentRead,
    }),
  );
  return {
    Item: out.Item ? unmarshall(out.Item) : undefined,
    ConsumedCapacity: out.ConsumedCapacity,
  };
}

/** @param {ReturnType<typeof import("./ddbRuntime.mjs").createDdbRuntime>} rt */
export async function sendQueryCommand(rt, input) {
  if (!rt.isLowLevel) {
    return rt.doc.send(new QueryCommand(input));
  }
  const cmd = new NativeQueryCommand({
    TableName: input.TableName,
    IndexName: input.IndexName,
    KeyConditionExpression: input.KeyConditionExpression,
    FilterExpression: input.FilterExpression,
    ExpressionAttributeNames: input.ExpressionAttributeNames,
    ExpressionAttributeValues: input.ExpressionAttributeValues
      ? marshall(input.ExpressionAttributeValues, MARSHALL_OPTS)
      : undefined,
    Limit: input.Limit,
    ScanIndexForward: input.ScanIndexForward,
    ExclusiveStartKey: input.ExclusiveStartKey
      ? marshall(input.ExclusiveStartKey, MARSHALL_OPTS)
      : undefined,
    Select: input.Select,
  });
  const out = await rt.lowLevel.send(cmd);
  return {
    Items: (out.Items ?? []).map((it) => unmarshall(it)),
    LastEvaluatedKey: out.LastEvaluatedKey ? unmarshall(out.LastEvaluatedKey) : undefined,
    Count: out.Count,
    ConsumedCapacity: out.ConsumedCapacity,
  };
}

/** @param {ReturnType<typeof import("./ddbRuntime.mjs").createDdbRuntime>} rt */
export async function sendTransactWriteCommand(rt, input) {
  if (!rt.isLowLevel) {
    return rt.doc.send(new TransactWriteCommand(input));
  }
  return rt.lowLevel.send(
    new TransactWriteItemsCommand({
      TransactItems: mapTransactItemsToNative(input.TransactItems),
    }),
  );
}

/** @param {ReturnType<typeof import("./ddbRuntime.mjs").createDdbRuntime>} rt */
export async function sendBatchGetCommand(rt, input) {
  if (!rt.isLowLevel) {
    return rt.doc.send(new BatchGetCommand(input));
  }
  const requestItems = {};
  for (const [tableName, spec] of Object.entries(input.RequestItems ?? {})) {
    requestItems[tableName] = {
      Keys: (spec.Keys ?? []).map((k) => marshall(k, MARSHALL_OPTS)),
      ConsistentRead: spec.ConsistentRead,
      ProjectionExpression: spec.ProjectionExpression,
      ExpressionAttributeNames: spec.ExpressionAttributeNames,
    };
  }
  const out = await rt.lowLevel.send(new BatchGetItemCommand({ RequestItems: requestItems }));
  const Responses = {};
  for (const [tableName, items] of Object.entries(out.Responses ?? {})) {
    Responses[tableName] = items.map((it) => unmarshall(it));
  }
  let UnprocessedKeys;
  if (out.UnprocessedKeys && Object.keys(out.UnprocessedKeys).length > 0) {
    UnprocessedKeys = {};
    for (const [tableName, spec] of Object.entries(out.UnprocessedKeys)) {
      UnprocessedKeys[tableName] = {
        Keys: (spec.Keys ?? []).map((k) => unmarshall(k)),
        ConsistentRead: spec.ConsistentRead,
        ProjectionExpression: spec.ProjectionExpression,
        ExpressionAttributeNames: spec.ExpressionAttributeNames,
      };
    }
  }
  return { Responses, UnprocessedKeys };
}

/** @param {ReturnType<typeof import("./ddbRuntime.mjs").createDdbRuntime>} rt */
export async function sendPutCommand(rt, input) {
  if (!rt.isLowLevel) {
    return rt.doc.send(new PutCommand(input));
  }
  const put = {
    TableName: input.TableName,
    Item: marshall(input.Item, MARSHALL_OPTS),
  };
  if (input.ConditionExpression) put.ConditionExpression = input.ConditionExpression;
  if (input.ExpressionAttributeNames) put.ExpressionAttributeNames = input.ExpressionAttributeNames;
  if (input.ExpressionAttributeValues) {
    put.ExpressionAttributeValues = marshall(input.ExpressionAttributeValues, MARSHALL_OPTS);
  }
  return rt.lowLevel.send(new PutItemCommand(put));
}
