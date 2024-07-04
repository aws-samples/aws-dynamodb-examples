TABLE="Customers"

if [ $# -gt 0 ]
  then
    TABLE=$1
fi

BUCKET="s3-import-demo"
FOLDER="migrations/$TABLE/"

echo Migrating table $TABLE using S3 $BUCKET/$FOLDER

aws s3 rm s3://$BUCKET/$FOLDER --recursive

python3 mysql_desc_ddb.py $TABLE > target-tables/$TABLE.json

python3 mysql_s3.py $TABLE

aws dynamodb import-table \
    --s3-bucket-source S3Bucket=$BUCKET,S3KeyPrefix=$FOLDER \
    --region us-east-2 \
    --input-format DYNAMODB_JSON \
    --output json --query '{"Import  ":ImportTableDescription.ImportArn, "Status   ":ImportTableDescription.ImportStatus }' \
    --table-creation-parameters file://target-tables/$TABLE.json


#aws dynamodb describe-import \
#    --import-arn 'arn:aws:dynamodb:us-east-2:889485041841:table/Customers/import/01719173281483-c35ac611' \
#    --output json --query '{"Status         ":ImportTableDescription.ImportStatus, "FailureCode    ":ImportTableDescription.FailureCode, "FailureMessage ":ImportTableDescription.FailureMessage }'
#
echo Done
