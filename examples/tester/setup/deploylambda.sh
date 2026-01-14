#!/bin/bash

# First, create a nodejs function with the name "tester-function" in AWS Lambda.
# It should have DynamoDB, S3, and STS access
# Then, this script can be used to deploy the function code.

# Variables
FUNCTION_NAME="tester-function"
ZIP_FILE="lambda_function.zip"

echo  { '"type"': '"module"' } > package.json

# Step 1: Remove old zip file if it exists
if [ -f "$ZIP_FILE" ]; then
  echo "Removing old zip file..."
  rm "$ZIP_FILE"
fi

# Step 2: Zip the Node.js function and dependencies
echo "Zipping the Lambda function..."

zip -r "$ZIP_FILE" . -x "*.git*" "node_modules/*" ".cache/*" "*.sh" "*.md" "public/experiments/E*" ".DS_Store" "public/*"


# Step 3: Deploy the Lambda function
echo "Deploying the Lambda function..."
aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file fileb://"$ZIP_FILE" \
  --output json --query '{FunctionArn:FunctionArn, Role:Role}' 

# Step 4: Confirm deployment
if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed!"
fi


