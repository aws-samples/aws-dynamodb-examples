import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";
import config from '../config.json' with { type: 'json' };
// import { checkCustomRoutes } from "next/dist/lib/load-custom-routes";

const args = process.argv;
const expArgs = args.slice(2);

const expName = expArgs.length > 0 ? expArgs[0] : 'Reads.js';
const itemCount = expArgs.length > 1 ? expArgs[1] : 200;
const showEachRequest = expArgs.length > 2 ? expArgs[2] : false;
const waitForMinute = expArgs.length > 3 ? expArgs[3] : true;
const bucketName = config['bucketName'];

const payload = {
  expName: expName,
  itemCount: itemCount,
  showEachRequest: showEachRequest,
  waitForMinute: waitForMinute,
  bucketName: bucketName,
};

const functionName = 'tester-function';

const invoke = async (funcName, payload) => {
    const client = new LambdaClient({});
    
    const command = new InvokeCommand({
      FunctionName: funcName,
      Payload: JSON.stringify(payload),
      LogType: LogType.Tail,
    });

    const { Payload, LogResult } = await client.send(command);
    const result = Buffer.from(Payload).toString();
    const logs = Buffer.from(LogResult, "base64").toString();
    return { logs, result };
};
  
const invokeResponse = await invoke(functionName, payload);

// console.log(invokeResponse['logs']);
// console.log('***');


// console.log('invoke result: ');

const logsRaw = invokeResponse['logs'];
const result = invokeResponse['result'];

const logLines = logsRaw.split('\n');

const reqID = logLines[0];

const logs = logLines.slice(0, logLines.length - 3);

logs.forEach((logLine, idx) => {
    if (logLine.length > 0) {

      const displayLine = stripLambdaLogHeaders(logLine);
      if (displayLine && displayLine.length > 0) {
        console.log(displayLine);
      }
    }
});

function stripLambdaLogHeaders(logLine) {

    const logLineParts = logLine.split('\t');
    const logMsg = logLineParts[3];
    return logMsg;
    
}