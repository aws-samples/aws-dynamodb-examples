from constructs import Construct
from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_iam as iam,
    Duration,
    aws_events_targets as targets,
    
)
from aws_cdk.aws_events import Rule, Schedule

class DynamoDBCustomMetricsStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        # Defines an AWS Lambda resource
        my_lambda = _lambda.Function(
            self, 'Handler',
            runtime=_lambda.Runtime.PYTHON_3_9,
            memory_size=256,                          # Runs 2x faster than 128
            architecture=_lambda.Architecture.ARM_64, # Graviton tests as 8% faster
            code=_lambda.Code.from_asset('lambda'),
            handler='lambda_function.handler',
            environment={ 
                
            },
            # Execution is usually fast but worst case describing 2,500 tables can take a while
            # If you have many tables, consider limiting the scope via the Includes and Excludes env variables!
            timeout=Duration.seconds(60), # extended the duration from 3 seconds to a minute
        )
        # Add CloudWatch and DynamoDB permissions to Lambda
        my_lambda.add_to_role_policy(iam.PolicyStatement( 
            effect=iam.Effect.ALLOW,
            actions=[
                'dynamodb:DescribeTable',
                'dynamodb:ListTables',
                'cloudwatch:PutMetricData',
            ],
            resources=[
                '*',
            ],
        ))
        # Add eventbridge rule which runs the Lambda each hour
        lambda_target = targets.LambdaFunction(handler = my_lambda)
        event_rule = Rule(self, "ScheduleRule",
            schedule=Schedule.rate(Duration.seconds(3600)),
            targets=[lambda_target]
        )
       

        
