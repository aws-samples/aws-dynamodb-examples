#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DdbGlobalMrscCdkStack } from '../lib/ddb-global-mrsc-cdk-stack';
import { RegionalKmsStack } from '../lib/regional-kms-stack';
import * as fs from 'fs';
import * as path from 'path';
import { RegionConfig, GlobalTableConfig } from '../lib/types';

const app = new cdk.App();

// Load config
const configPath = path.join(__dirname, '..', 'config.json');
const config: GlobalTableConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create regional KMS stacks for all regions except primary
const primaryRegion = config.regions[0].region;
const regionalStacks: cdk.Stack[] = [];

for (const regionConfig of config.regions) {
  if (regionConfig.region !== primaryRegion && !regionConfig.witness) {
    const stack = new RegionalKmsStack(app, `DdbGlobalMrsc${regionConfig.region.replace(/-/g, '')}`, {
      env: { 
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: regionConfig.region 
      },
      tableName: config.tableName
    });
    regionalStacks.push(stack);
  }
}

// Main global table stack
const globalStack = new DdbGlobalMrscCdkStack(app, 'DdbGlobalMrscCdkStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: primaryRegion
  }
});

// Add dependencies
regionalStacks.forEach(stack => globalStack.addDependency(stack));