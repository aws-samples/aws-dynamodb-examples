# DynamoDB Global Table with Multi-Region Strong Consistency

This example demonstrates how to create a DynamoDB Global Table with `MultiRegionConsistency: STRONG` using AWS CDK and a CloudFormation L1 override. The implementation supports JSON configuration for multi-region deployment with witness region capabilities.

## Configuration

### Setting up config.json

1. Copy one of the example configurations from the `config-examples/` directory:
   ```bash
   cp config-examples/us-regions.json config.json
   # OR
   cp config-examples/eu-regions.json config.json
   # OR
   cp config-examples/ap-regions.json config.json
   ```

2. Modify the `config.json` file as needed for your deployment.

### Configuration Format

The `config.json` file defines deployment regions and witness settings:

```json
{
  "regions": [
    {
      "region": "us-east-1",
      "witness": false
    },
    {
      "region": "us-east-2", 
      "witness": false
    },
    {
      "region": "us-west-2",
      "witness": true
    }
  ]
}
```

**Requirements:**
- Minimum 3 regions required
- All regions must be from the same geographical set
- At least 2 regions must be full replicas (`"witness": false`)
- Maximum 1 region can be a witness (`"witness": true`)

### Valid Region Sets

Regions must be from the same geographical set:

- **US Regions**: us-east-1, us-east-2, us-west-2
- **EU Regions**: eu-west-1, eu-west-2, eu-west-3, eu-central-1  
- **AP Regions**: ap-northeast-1, ap-northeast-2, ap-northeast-3

### Witness Regions

Set `"witness": true` for a single region that should act as a witness-only replica. Only one witness region is allowed per global table. Witness regions provide additional voting capacity for strong consistency without serving read/write traffic.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your deployment by copying an example:
   ```bash
   cp config-examples/us-regions.json config.json
   ```

3. Modify `config.json` for your specific requirements.

## Deploy

```bash
npx cdk deploy --all
```

## Key Implementation

The implementation includes:

1. **JSON Configuration Loading**: Reads region configuration from `config.json`
2. **Region Validation**: Ensures regions are valid and from the same geographical set
3. **Dynamic KMS Stack Creation**: Creates regional KMS stacks based on configuration
4. **Witness Region Support**: Adds `GlobalTableWitness` property for witness regions
5. **Strong Consistency**: Applies `MultiRegionConsistency: STRONG` override

```typescript
// Load and validate configuration
const config = this.loadConfig();
this.validateConfig(config);

// Create global table with dynamic replicas
const globalTable = new dynamodb.TableV2(this, 'GlobalTable', {
  // ... configuration
  replicas: config.regions
    .filter(r => r.region !== this.region)
    .map(r => ({ region: r.region }))
});

// Add strong consistency and witness regions
const cfnTable = globalTable.node.defaultChild as dynamodb.CfnTable;
cfnTable.addPropertyOverride('MultiRegionConsistency', 'STRONG');
this.addWitnessRegions(cfnTable, config);
```

## AWS Documentation References

- [DynamoDB Global Tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html) - Overview of Global Tables functionality
- [CloudFormation GlobalTable Resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-globaltable.html#cfn-dynamodb-globaltable-multiregionconsistency) - MultiRegionConsistency property reference
- [GlobalTableWitness Property](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-globaltable-globaltablewitness.html) - Witness region configuration reference