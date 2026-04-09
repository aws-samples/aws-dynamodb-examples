# Setup

[HOME](../README.md) - **Setup** - [Jobs](../jobs/README.md) - [Charts](../app/README.md)


## Solution components
There are three main components of this solution:
 * **setup**: New table definitions and setup scripts
 * **jobs**: Multi-step job definitions that save request latency details to S3
 * **app**: A custom Next.JS web app that renders charts of experiment results

![spash-image_002](../public/tester_s02.png)

It's recommended to deploy and run the job system within AWS on an EC2 host. When jobs are run in AWS in the same region as the DynamoDB table, the lowest latencies will be seen.

It's also recommended to deploy the App onto your laptop, so that you will have easy and personal access to browse job results using the chart dashboard. 

# Jobs Setup

### Pre-requisites
* A bash environment such as an EC2 host or laptop terminal
* AWS CLI, configured with IAM access to DynamoDB, S3, Cloudwatch, and STS
* Node.JS 

### Environment setup

1. Upgrade Node.JS to the latest version.
```
nvm install --lts
```
2. Verify your environment can access AWS
```
aws sts get-caller-identity
```

3. Clone this repository

 ```
 git clone https://github.com/aws-samples/aws-dynamodb-examples.git
 ```

4. Install Node.JS dependencies
   
   ```
   cd aws-dynamodb-examples/examples/tester
   npm install
   ```

5. Navigate to the /setup folder and notice the tester_tables.yaml file which defines a Cloudformation stack, including four DynamoDB tables and an S3 bucket. 
   
```
   cd setup
   chmod +x ./deploy_cf.sh
   ./deploy_cf.sh
```
   When the stack deployment is complete, check the outputs for the BucketName value, and copy it.

   Navigate to the tester/ root folder and open the file called ```/.env```
   
   Update this file like this: TESTER_BUCKET=<your new bucket name>
   
 
  Each DynamoDB table has a key schema of PK and SK, and is in On Demand capacity mode. The final two tables are Global Tables.

   * mytable
   * everysize
   * MREC
   * MRSC
  
The server-side component of tester is now set. Let's switch gears and deploy the client App component on your laptop. This webapp will serve the charts dashboard showing the latency of the test executions.

# App Setup
### Pre-requisites

* Node.JS v18 or higher
* AWS CLI, configured with IAM access to S3 

1. From your laptop, open a terminal (command) prompt, and clone the project repository again. 

 ```
 git clone https://github.com/aws-samples/aws-dynamodb-examples.git
 ```
   
2.  Next, install the required dependency modules (these listed in the *package.json* file).
```
cd aws-dynamodb-examples/examples/tester
npm install
```

3. Navigate to the tester/ root folder and open the file called ```/.env```
   
   Update this file like this: TESTER_BUCKET=<your new bucket name>

4. Launch the web app. This will run a custom [Next.js](https://nextjs.org/) app from your laptop. 
   
```
cd app
npm run dev
```

5. Open a browser and navigate to http://localhost:3000

You should see a web app in your browser called **tester** that is configured to point to the same Jobs S3 bucket.

**tester** is now ready for action! 

Next, you will run [Jobs](../jobs/README.md)
