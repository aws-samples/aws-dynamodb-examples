
PK=""

if [ $# -gt 0 ]
  then
    PK=($1)
else
    echo Error: pass in the Query PK value, such as C1.B2.A004 or C1.B1.A007 or C1.B2.A006
    exit
fi

aws dynamodb query \
  --table-name ledger --region us-west-2 \
  --key-condition-expression "AccountID = :aid" \
  --expression-attribute-values '{":aid" : {"S": "'$PK'"}}' \
    | jq -r '["PK: AccountID", "SK: Event", "Amount"], (.Items[] | [.AccountID.S, .Event.S, .Amount.S]) | @csv' | rich --csv -


