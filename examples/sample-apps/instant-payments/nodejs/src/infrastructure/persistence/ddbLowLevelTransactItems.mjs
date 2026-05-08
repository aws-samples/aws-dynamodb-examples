import { marshall } from "@aws-sdk/util-dynamodb";
import { MARSHALL_OPTS } from "./ddbMarshalling.mjs";

export function mapTransactItemsToNative(items) {
  return items.map((ti) => {
    if (ti.Put) {
      const p = ti.Put;
      const put = {
        TableName: p.TableName,
        Item: marshall(p.Item, MARSHALL_OPTS),
      };
      if (p.ConditionExpression) put.ConditionExpression = p.ConditionExpression;
      if (p.ExpressionAttributeNames) put.ExpressionAttributeNames = p.ExpressionAttributeNames;
      if (p.ExpressionAttributeValues) {
        put.ExpressionAttributeValues = marshall(p.ExpressionAttributeValues, MARSHALL_OPTS);
      }
      return { Put: put };
    }
    if (ti.Update) {
      const u = ti.Update;
      const upd = {
        TableName: u.TableName,
        Key: marshall(u.Key, MARSHALL_OPTS),
        UpdateExpression: u.UpdateExpression,
      };
      if (u.ConditionExpression) upd.ConditionExpression = u.ConditionExpression;
      if (u.ExpressionAttributeNames) upd.ExpressionAttributeNames = u.ExpressionAttributeNames;
      if (u.ExpressionAttributeValues) {
        upd.ExpressionAttributeValues = marshall(u.ExpressionAttributeValues, MARSHALL_OPTS);
      }
      return { Update: upd };
    }
    if (ti.Delete) {
      throw new Error("Transact Delete not implemented for low-level bridge");
    }
    throw new Error(`Unsupported TransactItems entry: ${Object.keys(ti).join(",")}`);
  });
}
