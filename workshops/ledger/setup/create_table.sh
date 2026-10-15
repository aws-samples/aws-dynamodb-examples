REGION=us-east-1

ENDPOINTURL=https://dynamodb.$REGION.amazonaws.com
# ENDPOINTURL=http://localhost:8000
OUTPUT=text

TableList=("journal" "ledger" "accounts")
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
    # aws dynamodb wait table-exists --table-name $TableName --region $REGION --endpoint-url $ENDPOINTURL

done

echo
echo Setup complete



