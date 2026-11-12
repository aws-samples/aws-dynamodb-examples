ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo TESTER_BUCKET=tester-data-23429755${ACCOUNT_ID}134 > .env
