aws cloudformation deploy --template-file ./tester_tables.yaml --stack-name tester-tables --region us-east-1

# aws cloudformation create-change-set   --stack-name tester-tables --change-set-name TesterChangeSetDryRun --template-body file://tester_tables.yaml 
# aws cloudformation describe-change-set --stack-name tester-tables --change-set-name TesterChangeSetDryRun 


# aws cloudformation delete-stack --stack-name tester-tables
# aws cloudformation wait stack-delete-complete --stack-name tester-tables

