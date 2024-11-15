TABLE="Customers"
REGION=$AWS_DEFAULT_REGION

if [ $# -gt 0 ]
  then
    TABLE=$1
fi

KEYS_NEEDED=2

if [ $# -gt 1 ]
  then
    KEYS_NEEDED=$2
fi

if [[ "dynamodb" = $MIGRATION_STAGE ]]
  then
    echo
    echo Error: run this in a shell with MIGRATION_STAGE="relational"
    echo
    exit 1
fi

python3 mysql_desc_ddb.py $TABLE $KEYS_NEEDED > target-tables/$TABLE.json

BUCKET=$MIGRATION_BUCKET
FOLDER="migrations/$TABLE/"

echo Migrating into table $TABLE using S3 $BUCKET/$FOLDER

# aws s3 rm s3://$BUCKET/$FOLDER --recursive

printf "\n"

python3 mysql_s3.py $TABLE

aws dynamodb import-table \
    --s3-bucket-source S3Bucket=$BUCKET,S3KeyPrefix=$FOLDER \
    --region $REGION \
    --input-format DYNAMODB_JSON \
    --output json --query '{"Import  ":ImportTableDescription.ImportArn, "Status   ":ImportTableDescription.ImportStatus }' \
    --table-creation-parameters file://target-tables/$TABLE.json

echo Table: $TABLE will be ready soon

#aws dynamodb describe-import \
#    --import-arn 'arn:aws:dynamodb:us-west-2:889485041841:table/Customers/import/01719173281483-c35ac611' \
#    --output json --query '{"Status         ":ImportTableDescription.ImportStatus, "FailureCode    ":ImportTableDescription.FailureCode, "FailureMessage ":ImportTableDescription.FailureMessage }'
#

