import boto3
aas_client = boto3.client('application-autoscaling')
#iam_client = boto3.client('iam')

table_name = "Music" # Add the name of the DynamoDB table you want to add auto-scaling to between the double quotes.

# detach the Write scaling policy to the table.
response = aas_client.delete_scaling_policy(
    PolicyName='{}ScalingPolicy'.format(table_name),
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:WriteCapacityUnits'
)

# detach the Read scaling policy to the table.
response = aas_client.delete_scaling_policy(
    PolicyName='{}ScalingPolicy'.format(table_name),
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:ReadCapacityUnits'
)

# Deregister the RCU targets for the table
response = aas_client.deregister_scalable_target(
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:ReadCapacityUnits',
)

# Deregister the WCU targets for the table
response = aas_client.deregister_scalable_target(
    ServiceNamespace='dynamodb',
    ResourceId='table/{}'.format(table_name),
    ScalableDimension='dynamodb:table:WriteCapacityUnits',
)