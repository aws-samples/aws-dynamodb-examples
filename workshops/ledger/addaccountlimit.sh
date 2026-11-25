aws dynamodb put-item \
  --table-name journal-indexed \
  --item '{
    "AccountID":        { "S": "C1.B2.A001" },
    "Event":            { "S": "AccountPrimary" },
    "AccountPrimary":   { "S": "AccountPrimary" },
    "name":             { "S": "Sam" }, 
    "spendlimit":       { "N": "50" },
    "features":         { "M": { "creditscore": {"N": "715"}, "logins": {"L": [{"S":"USA"},{"S":"Canada"}]} } }
  }'

aws dynamodb put-item \
  --table-name journal-indexed \
  --item '{
    "AccountID":        { "S": "C1.B2.A002" },
    "Event":            { "S": "AccountPrimary" },
    "AccountPrimary":   { "S": "AccountPrimary" },
    "name":             { "S": "Pat" }, 
    "spendlimit":       { "N": "100" },
    "features":         { "M": { "creditscore": {"N": "735"}, "logins": {"L": [{"S":"USA"},{"S":"Mexico"}]} } }
  }'

aws dynamodb put-item \
  --table-name journal-indexed \
  --item '{
    "AccountID":        { "S": "C1.B3.A001" },
    "Event":            { "S": "AccountPrimary" },
    "AccountPrimary":   { "S": "AccountPrimary" },
    "name":             { "S": "Jesse" }, 
    "spendlimit":       { "N": "70" },
    "features":         { "M": { "creditscore": {"N": "685"}, "logins": {"L": [{"S":"Ireland"},{"S":"Canada"}]} } }
  }'

