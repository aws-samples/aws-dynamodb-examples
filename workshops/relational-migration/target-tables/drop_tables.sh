REGION=us-east-2

ENDPOINTURL=https://dynamodb.$REGION.amazonaws.com
# ENDPOINTURL=http://localhost:8000
OUTPUT=text

# TableList=("DemoTable01" "DemoTable02" "DemoTable03" "DemoTable04")
TableList=("Customers" "Orders" "OrderLines" "Products" "Reps")
TableName=""
BUCKET="s3-import-demo"


if [ $# -gt 0 ]
  then
    TableName=$1
    # read -n1 -r -p "Warning! You are going to delete your DynamoDB table $TableName! press any key to continue..." key

    aws dynamodb delete-table --table-name $TableName --region $REGION \
        --endpoint-url $ENDPOINTURL \
        --output json --query '{"Deleting ":TableDescription.TableName}'

    aws dynamodb wait table-not-exists --table-name $TableName --region $REGION \
        --endpoint-url $ENDPOINTURL \
        --output json --query '{"Table ":TableDescription.TableName, "Status:":TableDescription.TableStatus }'

  else
    # read -n1 -r -p "Warning! You are going to delete DynamoDB tables $TableList! press any key to continue..." key

    for TableName in "${TableList[@]}"
    do
      FOLDER="migrations/$TableName/"
      aws s3 rm s3://$BUCKET/$FOLDER --recursive
      aws dynamodb delete-table --table-name $TableName --region $REGION \
          --endpoint-url $ENDPOINTURL \
          --output json --query '{"Deleting ":TableDescription.TableName}'

      aws dynamodb wait table-not-exists --table-name $TableName --region $REGION \
          --endpoint-url $ENDPOINTURL \
          --output json --query '{"Table ":TableDescription.TableName, "Status:":TableDescription.TableStatus }'

    done

fi
