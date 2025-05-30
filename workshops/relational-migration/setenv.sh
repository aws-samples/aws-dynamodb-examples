# tip: run "source ./setenv.sh" to apply these environment variables for the rest of this session

# tip: to see all env vars sorted, you can run:  env -0 | sort -z | tr '\0' '\n'
DEPLOYMENT="workshop"
if [ $# -gt 0 ]
  then
    DEPLOYMENT=$1
fi

# export AWS_DEFAULT_REGION="us-west-2"

export MYSQL_DB="app_db"
export MIGRATION_STAGE="relational"
export MYSQL_HOST=$DEPLOYMENT

# export MYSQL_USERNAME="username"
# export MYSQL_PASSWORD="password"

if [[ "workshop" == $DEPLOYMENT ]]
  then

    MIGRATION_BUCKET=$(aws s3api list-buckets --prefix 'ddb-migrations3bucket' --query 'Buckets[0].Name')
    export MIGRATION_BUCKET=$(echo $MIGRATION_BUCKET | xargs)

    MYSQL_HOST=$(aws ec2 describe-instances  --query 'Reservations[0].Instances[0].PrivateIpAddress' --filters Name=tag:Name,Values=MySQL-Instance)
    export MYSQL_HOST=$(echo $MYSQL_HOST | xargs)

    SUBNET_ID=$(aws ec2 describe-instances  --query 'Reservations[0].Instances[0].SubnetId' --filters Name=tag:Name,Values=MySQL-Instance)
    export SUBNET_ID=$(echo $SUBNET_ID | xargs)

    SECURITY_GROUP=$(aws ec2 describe-instances  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --filters Name=tag:Name,Values=MySQL-Instance)
    export SECURITY_GROUP=$(echo $SECURITY_GROUP | xargs)

#    jq_update='.stages.relational.subnet_ids=["'
#    jq_update+=$SUBNET_ID
#    jq_update+='"]'
#
#    jq $jq_update .chalice/config.json > "$tmp" && mv "$tmp" .chalice/config.json
#
#    jq_update='.stages.relational.security_group_ids=["'
#    jq_update+=$SECURITY_GROUP
#    jq_update+='"]'
#
#    jq $jq_update .chalice/config.json > "$tmp" && mv "$tmp" .chalice/config.json


  else
    MIGRATION_BUCKET="s3-export-import"
    export MIGRATION_BUCKET=$(echo $MIGRATION_BUCKET | xargs)

    MYSQL_HOST=$DEPLOYMENT
    export MYSQL_HOST=$(echo $MYSQL_HOST | xargs)
fi


echo Environment variables set:
echo
echo MYSQL_HOST       = $MYSQL_HOST
echo MYSQL_DB         = $MYSQL_DB
echo MYSQL_USERNAME   = $MYSQL_USERNAME
echo MYSQL_PASSWORD   = $MYSQL_PASSWORD
echo MIGRATION_STAGE  = $MIGRATION_STAGE
echo MIGRATION_BUCKET = $MIGRATION_BUCKET
echo SECURITY_GROUP   = $SECURITY_GROUP
echo SUBNET_ID        = $SUBNET_ID

echo
tmp=$(mktemp)

#jq_update='.stages.relational.environment_variables.MYSQL_HOST="'
#jq_update+=$MYSQL_HOST
#jq_update+='"'
#
#jq $jq_update .chalice/config.json > "$tmp" && mv "$tmp" .chalice/config.json

sed -i "s/##DBHOST##/${MYSQL_HOST}/g" .chalice/config.json
sed -i "s/##DBUSERNAME##/${MYSQL_USERNAME}/g" .chalice/config.json
sed -i "s/##DBPASSWORD##/${MYSQL_PASSWORD}/g" .chalice/config.json
sed -i "s/##SUBNETID##/${SUBNET_ID}/g" .chalice/config.json
sed -i "s/##SECURITYGROUPID##/${SECURITY_GROUP}/g" .chalice/config.json


echo Chalice configuration file updated with MYSQL_HOST=$MYSQL_HOST