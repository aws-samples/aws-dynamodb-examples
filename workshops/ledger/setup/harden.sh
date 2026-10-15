
table=""

if [ $# -gt 0 ]
  then
    table=($1)
else
    echo Error: pass in a table name
    exit
fi

echo Hardening table $table

echo Adding Deletion Protection
aws dynamodb update-table \
    --table-name $table \
    --deletion-protection-enabled \
    --query '{"Deletion Protection ON":TableDescription.TableArn }'

echo Adding PITR
aws dynamodb update-continuous-backups \
    --table-name $table \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

echo Adding TTL
aws dynamodb update-time-to-live \
   --table-name $table \
   --time-to-live-specification "Enabled=true,AttributeName=TTL"

# aws dynamodb describe-table \
#   --table-name $table \
#   --query '{"Current WarmThroughput":Table.WarmThroughput}' 

echo Adding Warm Throughput to 40,000 WCU 
aws dynamodb update-table \
  --table-name $table \
  --query '{"Warm Throughput Status":TableDescription.WarmThroughput.Status}' \
  --warm-throughput ReadUnitsPerSecond=40000,WriteUnitsPerSecond=40000 \
