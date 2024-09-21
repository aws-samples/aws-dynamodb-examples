TABLE="Customers"
SQLFILE=""

if [ $# -gt 0 ]
  then
    TABLE=$1
    if [ $# -gt 1 ]
      then
        SQLFILE=$2
        echo Using custom SQL file: $SQLFILE
        # cp target-tables/Default.json target-tables/$TABLE.json
        SQL1='{"TableName": "'
        SQL2='",
                "KeySchema": [
                  {"AttributeName": "PK", "KeyType": "HASH"},
                  {"AttributeName": "SK", "KeyType": "RANGE"}
                ],
                "AttributeDefinitions": [
                  {"AttributeName": "PK", "AttributeType": "S"},
                  {"AttributeName": "SK", "AttributeType": "S"}
                ],
                "BillingMode": "PAY_PER_REQUEST"
}'

        printf "$SQL1$TABLE$SQL2" > target-tables/$TABLE.json
      else
        python3 mysql_desc_ddb.py $TABLE > target-tables/$TABLE.json
      fi
fi

BUCKET="s3-import-demo"
FOLDER="migrations/$TABLE/"

echo Migrating into table $TABLE using S3 $BUCKET/$FOLDER

aws s3 rm s3://$BUCKET/$FOLDER --recursive

printf "\n"

python3 mysql_s3.py $TABLE $SQLFILE

aws dynamodb import-table \
    --s3-bucket-source S3Bucket=$BUCKET,S3KeyPrefix=$FOLDER \
    --region us-east-2 \
    --input-format DYNAMODB_JSON \
    --output json --query '{"Import  ":ImportTableDescription.ImportArn, "Status   ":ImportTableDescription.ImportStatus }' \
    --table-creation-parameters file://target-tables/$TABLE.json

echo Table: $TABLE will be ready as soon

#aws dynamodb describe-import \
#    --import-arn 'arn:aws:dynamodb:us-east-2:889485041841:table/Customers/import/01719173281483-c35ac611' \
#    --output json --query '{"Status         ":ImportTableDescription.ImportStatus, "FailureCode    ":ImportTableDescription.FailureCode, "FailureMessage ":ImportTableDescription.FailureMessage }'
#

