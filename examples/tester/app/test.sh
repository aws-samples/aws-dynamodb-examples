

aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name SuccessfulRequestLatency \
     --start-time 2025-05-04T23:46:00Z \
     --end-time   2025-05-04T23:49:00Z \
     --period 60 \
     --statistics "Average" "Maximum"    \
     --dimensions Name=TableName,Value=mytable Name=Operation,Value=GetItem 


# aws cloudwatch get-metric-statistics \
#      --namespace AWS/DynamoDB \
#      --metric-name ConsumedReadCapacityUnits \
#      --start-time 2025-05-03T18:11:00Z \
#      --end-time   2025-05-03T18:13:00Z \
#      --period 360 \
#      --statistics Average \
#      --dimensions Name=TableName,Value=mytable

