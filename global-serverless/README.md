## Global Serverless workshop 🌎 🌍 🌏

Welcome! This workshop will show you how to use DynamoDB Global Tables as the
foundation for a resilient multi-region serverless application.

### Scenario 🎥 🎞 📺   
Let's imagine we run a consulting shop that specializes in building serverless applications 
for the media and entertainment industry.  This morning we received a request from a major 
streaming service. The would like us to propose and build a replacement for their end-user 
app that lets customers find and watch content.  For the project to be a success, the app must
meet the following requirements:

### Requirements 📝 ☑️ ☑️  

* Users can browse available movies and shows 
* Bookmarking so that user can resume a show later
* Cloud based and serverless
* Deployed to two or three global regions
* User data should be synchronized and available in each region
* The app is able to continue even if a region goes offline


#### Current Skills
Our in-house developers know how to write Python scripts and build UIs, but they are somewhat new to the cloud.
Anything that can automate the cloud build and deploy process will be a boon to them.

### Stack 
Let's first get a serverless application built and running in a single region.
We'll use these core services.

* Amazon S3 bucket hosting a web application
* Amazon API Gateway
* Amazon Lambda function in python3.9
* Amazon DynamoDB Table

#### Web Architecture
For the web application, we can build a static web app, with just html, css, and js files.
As this doesn't itself need a runtime environment, we can load the web app from either
our project folder, or a public URL such as the URL of a public S3 bucket.

### Service Architecture
We consider using shell scripts, Cloudformation or SAM to coordinate the back-end services, 
but our developers are not sure about how to write complex YAML configurations.
A friend tells us about AWS Chalice, an open source framework at [github.com/aws/chalice](https://github.com/aws/chalice)
It seems to be Python based, let us give it a try. 

### Database Table
We can use Amazon DynamoDB, the NoSQL database engine, to create a Bookmarks table. 
All records in DynamoDB need to have a Partition Key, and optional Sort Key. 
Our entities so far are users and shows, so let's model that as PK: UserID and SK: ShowID.
A third attribute, called Bookmark, can record the number of seconds into the show any one customer is. 
An update function can increment this number at regular intervals to record the progress. 
We can retrieve the current value of any bookmark using the Get-Item command.

### Pre-requisites
* An AWS Cloud9 or CloudShell instance

Or

* Command prompt with Python3, GIT, and the AWS Command Line Interface (CLI) installed and configured with credentials

### Setup Steps

#### Verify Environment
1. Run ```aws sts get-caller-identity``` to verify the AWS CLI and run ```python3 --version```
2. Install [AWS Chalice](https://github.com/aws/chalice) ```python3 -m pip install chalice```
3. Run ```git clone https://github.com/aws-samples/aws-dynamodb-examples.git```
4. Run ```cd global-serverless```
5. Notice the [app.py](app.py) file. This code defines Lambda function and API Gateway routes. 


#### Deploy a new DynamoDB table
1. In your command prompt, run:

```
aws dynamodb create-table \
    --region us-west-2 \
    --table-name global-serverless2 \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --query '{"New Table ":TableDescription.TableArn, 
              "Status    ":TableDescription.TableStatus }'

```

2. Wait a moment for the table to be created. 

Check to see when the table status changes 
from CREATING to ACTIVE by running this command:
```
aws dynamodb describe-table \
--table-name global-serverless \
--query '{TableStatus: Table.TableStatus}'
```

3.Our table is in us-west-2 (Oregon). 
Let's make it a **Global Table** by requesting a replica in us-east-2 (Ohio).

Run this command to create a new replica in the us-east-2 (Ohio) region.
```
aws dynamodb update-table --table-name global-serverless --region=us-west-2 --cli-input-json  \
'{"ReplicaUpdates": [
    {
        "Create": {"RegionName": "us-east-2" }
        }
    ]}'
```

Check to see the table's replica status
by running this command:
```
aws dynamodb describe-table \
--table-name global-serverless \
--query '{TableStatus: Table.TableStatus,
             Replicas: Table.Replicas}'
```

4. Next, add some data to the table:
Writing to a Global Table is done by writing to any of the regional replica tables.

Run this command to create a new item with put-item:
```
aws dynamodb put-item \
  --table-name global-serverless \
  --region us-west-2 \
  --item '{ "PK": {"S": "user100"}, "SK": {"S": "AshlandValley"}, "Bookmark": {"N": "0"} }' 
```

This item represents a user's bookmark of how many seconds 
they have watched of a particular show.

#### Deploy the backend API service to the first region

1. Run ```aws configure``` and press enter four times. Notice the current region is shown on the third prompt. Run the command again if you need to change the region to 'us-west-2'
2. Run ```chalice deploy``` and wait for the infrastructure to be created.
4. When the script completes, it reports a list of resources deployed. The Rest API URL is noteworthy.  
5. Copy that URL and paste it into a new browser tab to test it. You should see a JSON response of {ping: "ok"}
6. You can type in certain paths to the end of the URL. Add the word scan so that the URL now ends with ```/api/scan```
 You should see a JSON response representing the results of a table scan.
7. Remove the word scan and then copy the API URL for use in the next steps.


#### Open the Web App
* Click to [https://dynamodbworkshop.s3.amazonaws.com/global-serverless/index.html](https://dynamodbworkshop.s3.amazonaws.com/global-serverless/index.html)

This app deployed as a static html site and does not directly make any calls to AWS.
Instead it has an **Add API** button by which you can enter an API URL. When you click save, it will store the URL
as a browser cookie, and show a set of buttons which you can use to test the API.

1. Paste in the API URL to the web app and click Save. Test the API works by pressing the Ping button.

The app code is found in your local [web](/web) folder. You could open the same html from here 
or deploy the folder to a web server or public S3 bucket (optional).


#### Deploy the service stack to the second region
1. Run ```aws configure``` and press enter four times. Notice the current region is shown on the third prompt. 
2. Run this command again but now change the region to 'us-east-2'
3. Run ```chalice deploy``` and wait for the infrastructure to be created in us-east-2.
4. When the script completes, it reports a list of resources deployed. The Rest API URL is noteworthy. 
5. Copy and paste this URL to the web app, and a second row of buttons appears in an alternate color.

#### Test Global Tables performance
Return to the web app and play with the read and write buttons. 
See if you can write in one region and quickly read the stale value in the other region.
Global Tables replication usually completes in 1-2 seconds, so repeat any stale read and it should soon match the item in the original region.

Create a conflict! Increment in one region and quickly Decrement in the other region. 
If you were fast enough, you caused a conflict on the wire. DynamoDB will compare conflicting updates and apply the later image to all regions.


#### Monitor Replication Latency
In the DynamoDB Console, open your table and click on the Monitor Tab.
Wait for all charts to load. Scroll down and locate the one showing Replication Latency.
This stat measures the time for item changes to successfully replicate to the other replicas.
You can monitor this stat to determine if Global Tables replication is healthy.



