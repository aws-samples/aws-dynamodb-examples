# In order for this script to work, the calling account must have permissions to create policies and roles in IAM
# and the DynamoDB table must already be in provisioned capacity mode.

import boto3
import json
aas_client = boto3.client('application-autoscaling')
iam_client = boto3.client('iam')

table_name = "YourTableName" # Add the name of the DynamoDB table you want to add auto-scaling to between the double quotes.
min_capacity = 1 # The minimum capacity for the auto-scaling policy
max_capacity = 100 # The maximum capacity for the auto-scaling policy
read_target = 50 # The target percentage utilization for read capacity
write_target = 50 # The target percentage utilization for write capacity
cooldown_duration_sec = 150 # How long in seconds

role_name = '{}TableScalingRole'.format(table_name)
policy_name = '{}TableScalingPolicy'.format(table_name)

assume_role_policy_document = {"Version": "2012-10-17", "Statement": [{"Effect": "Allow","Principal": {"Service": [ "ec2.amazonaws.com" ]},"Action": ["sts:AssumeRole"]}]}
policy_document = {"Version": "2012-10-17", "Statement":[{"Effect": "Allow", "Action": ["dynamodb:DescribeTable", "dynamodb:UpdateTable", "cloudwatch:PutMetricAlarm", "cloudwatch:DescribeAlarms", "cloudwatch:GetMetricStatistics", "cloudwatch:SetAlarmState", "cloudwatch:DeleteAlarms"], "Resource": "*"}]}

# Create the role necessary for auto-scaling
create_role_response = iam_client.create_role(
    Path='/',
    RoleName=role_name,
    AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
    Description='Table Scaling Role for {}'.format(table_name),
    MaxSessionDuration=3600
)

# Create the policy needed by the role
create_policy_response = iam_client.create_policy(
    PolicyName=policy_name,
    Path='/',
    PolicyDocument=json.dumps(policy_document)
)

role_arn = create_role_response['Role']['Arn']
policy_arn = create_policy_response['Policy']['Arn']

# Attach the policy to the role so it can be used.
response = iam_client.attach_role_policy(
    RoleName=role_name,
    PolicyArn=policy_arn
)

# Register the RCU targets for the table
response = aas_client.register_scalable_target(
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:ReadCapacityUnits',
    MinCapacity=min_capacity,
    MaxCapacity=max_capacity,
    RoleARN=role_arn
)

# Register the WCU targets for the table
response = aas_client.register_scalable_target(
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:WriteCapacityUnits',
    MinCapacity=min_capacity,
    MaxCapacity=max_capacity,
    RoleARN=role_arn
)

# Attach the Read scaling policy to the table.
response = aas_client.put_scaling_policy(
    PolicyName='{}ScalingPolicy'.format(table_name),
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:ReadCapacityUnits',
    PolicyType='TargetTrackingScaling',
    TargetTrackingScalingPolicyConfiguration={
        'TargetValue': read_target,
        'PredefinedMetricSpecification': {'PredefinedMetricType': 'DynamoDBReadCapacityUtilization'},
        'ScaleOutCooldown': cooldown_duration_sec,
        'ScaleInCooldown': cooldown_duration_sec,
        'DisableScaleIn': True
    }
)

# Attach the Write scaling policy to the table.
response = aas_client.put_scaling_policy(
    PolicyName='{}ScalingPolicy'.format(table_name),
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:WriteCapacityUnits',
    PolicyType='TargetTrackingScaling',
    TargetTrackingScalingPolicyConfiguration={
        'TargetValue': write_target,
        'PredefinedMetricSpecification': {'PredefinedMetricType': 'DynamoDBWriteCapacityUtilization'},
        'ScaleOutCooldown': cooldown_duration_sec,
        'ScaleInCooldown': cooldown_duration_sec,
        'DisableScaleIn': True
    }
)
