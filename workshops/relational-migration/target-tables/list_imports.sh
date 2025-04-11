aws dynamodb list-imports \
    --output json \
    --query '{
                "Import ":   ImportSummaryList[].ImportArn,
                "Status":    ImportSummaryList[].ImportStatus,
                "StartTime": ImportSummaryList[].StartTime,
                "EndTime":   ImportSummaryList[].EndTime
                }'
