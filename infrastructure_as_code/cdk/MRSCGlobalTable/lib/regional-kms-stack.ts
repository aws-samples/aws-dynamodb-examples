import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

interface RegionalKmsStackProps extends cdk.StackProps {
  tableName: string;
}

export class RegionalKmsStack extends cdk.Stack {
  public readonly kmsKey: kms.Key;

  constructor(scope: Construct, id: string, props: RegionalKmsStackProps) {
    super(scope, id, props);

    this.kmsKey = new kms.Key(this, 'RegionalKey', {
      description: `KMS key for DynamoDB Global Table replica in ${props.env?.region}`,
      enableKeyRotation: true,
      alias: `${props.tableName}-${props.env?.region}`
    });

    new cdk.CfnOutput(this, 'KmsKeyArn', {
      value: this.kmsKey.keyArn,
      exportName: `${this.stackName}-KmsKeyArn`
    });
  }
}