            # aws dynamodb update-table --table-name MRSC \
            #     --replica-updates '[{"Delete": {"RegionName": "us-east-2"}}, {"Delete": {"RegionName": "us-west-2"}}]' \
            #     --region us-east-1 --endpoint-url https://dynamodb.us-east-1.amazonaws.com --output json --query 'TableDescription.TableArn' 

REGION=$AWS_REGION

if [ -z "$REGION" ]; then
  REGION="us-east-1"
fi

ENDPOINTURL=https://dynamodb.$REGION.amazonaws.com
# ENDPOINTURL=http://localhost:8000

OUTPUT=text

TableList=("mytable" "MREC" "MRSC" "everysize")
TableName=""

if [ $# -gt 0 ]
  then
    TableName=$1
    aws dynamodb delete-table --table-name $1 --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn'
  else
    for TableName in "${TableList[@]}"
    do
        if [ $TableName == "MREC" ] 
        then
            echo dropping us-east-2 replica for MREC
            aws dynamodb update-table --table-name $TableName \
                --replica-updates '[{"Delete": {"RegionName": "us-east-2"}}]' \
                --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn' 

            aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

            echo dropping us-west-2 replica for MREC
            aws dynamodb update-table --table-name $TableName \
                --replica-updates '[{"Delete": {"RegionName": "us-west-2"}}]' \
                --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn' 

            aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL


        fi

        if [ $TableName == "MRSC" ] 
        then
            echo dropping replica regions for MRSC
            aws dynamodb update-table --table-name $TableName \
                --replica-updates '[{"Delete": {"RegionName": "us-east-2"}}, {"Delete": {"RegionName": "us-west-2"}}]' \
                --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn' 
        
            aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL
    
        fi

        aws dynamodb delete-table --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL --output $OUTPUT --query 'TableDescription.TableArn'

    done
fi

echo Table deletion in process, please wait...
# await final table deletion
aws dynamodb wait table-not-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL
