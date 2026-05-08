/**
 * Barrel: Document Client vs low-level DynamoDB with a single JS-shaped API for callers.
 * Implementation is split across `ddbRuntime.mjs`, `ddbBridgeCommands.mjs`, and helpers.
 */
export { createDdbRuntime } from "./ddbRuntime.mjs";
export {
  sendBatchGetCommand,
  sendGetCommand,
  sendPutCommand,
  sendQueryCommand,
  sendTransactWriteCommand,
} from "./ddbBridgeCommands.mjs";
