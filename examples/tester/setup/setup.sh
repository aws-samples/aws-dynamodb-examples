REGION=$AWS_REGION

if [ -z "$REGION" ]; then
    echo Please set AWS_REGION environment variable
    echo i.e. run:
    echo export AWS_REGION=us-east-1
    exit
fi

mkdir ../public/experiments

AWS_ACCT=$(aws sts get-caller-identity --output text --query 'Account')
ACCT_HASH=$(printf "%s" $AWS_ACCT |  md5sum)

BUCKET_NAME="tester-"${ACCT_HASH:0:10}
BUCKET_ARN="arn:aws:s3:$REGION:$AWS_ACCT:$BUCKET_NAME"

echo "Tester Setup: Deploying S3 bucket, tables, and sample data in $REGION for $AWS_ACCT"
echo

if aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
    echo S3 bucket exists 
    echo $BUCKET_ARN 

else

    REGION=us-east-1
    BUCKET_NAME=tester-b4797f01b4

    echo Creating S3 bucket 
    aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION  >/dev/null 
    aws s3api wait bucket-exists --bucket $BUCKET_NAME
    echo $BUCKET_ARN

fi


echo "{  \"bucketName\": \"$BUCKET_NAME\"}" > ../config.json
echo Bucket name now set in config.json


ENDPOINTURL=https://dynamodb.$REGION.amazonaws.com
# ENDPOINTURL=http://localhost:8000
OUTPUT=text

TableList=("mytable" "MREC" "MRSC" "everysize")
TableName=""

if [ $# -gt 0 ]
  then
    TableList=($1)
fi

for TableName in "${TableList[@]}"
do
    echo
    echo Creating $TableName
    aws dynamodb create-table --cli-input-json file://$TableName.json --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn'
    aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

    if [ $TableName == "MREC" ] 
    then

        echo Updating $TableName to add regions
        aws dynamodb update-table --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableStatus' --cli-input-json  \
            '{"ReplicaUpdates": [ 
                {"Create": {"RegionName": "us-east-2" }} 
            ]}' 

        aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

        aws dynamodb update-table --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableStatus' --cli-input-json  \
            '{"ReplicaUpdates": [ 
                {"Create": {"RegionName": "us-west-2" }} 
            ]}'      
        
        aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL
        
        echo Loading seed data
        cd ../jobs
        node Writes 200 MREC
        cd ../setup


    fi

    if [ $TableName == "MRSC" ] 
    then
        # echo updating $TableName provisioned capacity to 20,000 WCU
        # aws dynamodb update-table --table-name $TableName  --billing-mode PROVISIONED --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=20000    
        # aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

        echo Switching table from Provisioned Capacity to On Demand
        aws dynamodb update-table --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL --billing-mode PAY_PER_REQUEST --output $OUTPUT --query 'TableDescription.TableStatus' 
        aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

        echo Updating $TableName to add regions

        aws dynamodb update-table \
            --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL   \
            --replica-updates '[{"Create": {"RegionName": "us-east-2"}}, {"Create": {"RegionName": "us-west-2"}}]' \
            --output $OUTPUT --query 'TableDescription.TableStatus' \
            --multi-region-consistency STRONG  
        
        aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

        echo Loading seed data
        cd ../jobs
        node Writes 200 MRSC
        cd ../setup

    fi

done

echo Setup complete
echo



