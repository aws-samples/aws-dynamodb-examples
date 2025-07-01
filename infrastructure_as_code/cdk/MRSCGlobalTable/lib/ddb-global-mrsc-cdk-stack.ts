import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { RegionConfig, GlobalTableConfig } from './types';

const VALID_REGIONS = {
  US: ['us-east-1', 'us-east-2', 'us-west-2'],
  EU: ['eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1'],
  AP: ['ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3']
};

const ALL_VALID_REGIONS = [...VALID_REGIONS.US, ...VALID_REGIONS.EU, ...VALID_REGIONS.AP];

export class DdbGlobalMrscCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = this.loadConfig();
    this.validateConfig(config);

    const primaryKey = new kms.Key(this, 'GlobalTableKey', {
      description: 'KMS key for DynamoDB Global Table encryption',
      enableKeyRotation: true,
      alias: `${config.tableName}-${this.region}`
    });

    const replicaTableKeys = this.buildReplicaKeys(config);
    const replicas = config.regions
      .filter(r => r.region !== this.region && !r.witness)
      .map(r => ({ region: r.region }));

    const globalTable = new dynamodb.TableV2(this, 'GlobalTable', {
      tableName: config.tableName,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryptionV2.customerManagedKey(primaryKey, replicaTableKeys),
      replicas
    });

    const cfnTable = globalTable.node.defaultChild as dynamodb.CfnTable;
    cfnTable.addPropertyOverride('MultiRegionConsistency', 'STRONG');

    this.addWitnessRegions(cfnTable, config);
  }

  private loadConfig(): GlobalTableConfig {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  }

  private validateConfig(config: GlobalTableConfig): void {
    if (!config.regions || config.regions.length < 3) {
      throw new Error('Config must specify at least 3 regions');
    }

    for (const regionConfig of config.regions) {
      if (!ALL_VALID_REGIONS.includes(regionConfig.region)) {
        throw new Error(`Invalid region: ${regionConfig.region}. Valid regions: ${ALL_VALID_REGIONS.join(', ')}`);
      }
    }

    const regionSet = Object.values(VALID_REGIONS);
    const configRegions = config.regions.map(r => r.region);
    const isValidSet = regionSet.some(validSet => 
      configRegions.every(region => validSet.includes(region))
    );

    if (!isValidSet) {
      throw new Error('All regions must be from the same region set (US, EU, or AP)');
    }

    const witnessCount = config.regions.filter(r => r.witness).length;
    const fullReplicaCount = config.regions.filter(r => !r.witness).length;
    
    if (witnessCount > 1) {
      throw new Error('Maximum 1 witness region allowed');
    }
    
    if (fullReplicaCount < 2) {
      throw new Error('At least 2 full replica regions required');
    }
  }

  private buildReplicaKeys(config: GlobalTableConfig): Record<string, string> {
    const keys: Record<string, string> = {};
    for (const regionConfig of config.regions) {
      if (regionConfig.region !== this.region && !regionConfig.witness) {
        keys[regionConfig.region] = `arn:aws:kms:${regionConfig.region}:${this.account}:alias/${config.tableName}-${regionConfig.region}`;
      }
    }
    return keys;
  }

  private addWitnessRegions(cfnTable: dynamodb.CfnTable, config: GlobalTableConfig): void {
    const witnessRegions = config.regions.filter(r => r.witness);
    if (witnessRegions.length > 0) {
      cfnTable.addPropertyOverride('GlobalTableWitnesses', 
        witnessRegions.map(r => ({ Region: r.region }))
      );
    }
  }
}