# Cost Template

Before creating a new DynamoDB table, you may want to estimate
what its core costs will be, measured not in capacity units but dollars.
Or, you may have a table in On Demand mode and be wondering if Provisioned Capacity would be cheaper.

**Download:** [DynamoDB+Cost+Template.xlsx](DynamoDB+Cost+Template.xlsx)

This worksheet will help you estimate a table's cost of ownership, for a given time period.
The first step is to decide the table's average storage, read and write velocity levels
and then adjust the green values in cells C16-C18, and review the calculated costs in rows E, F, and G.
Both On Demand and Provisioned Capacity costs are shown side by side, along with storage costs.

![Cost Template Screenshot](https://dynamodb-images.s3.amazonaws.com/img/pricing_template_screenshot_sm_2025.jpg "DynamoDB Cost Template")

While Provisioned Capacity is generally less expensive, it is unrealistic to assume
you will ever be 100% efficient in using the capacity you pay for.
Even if using Auto Scaling, overhead is required to account for bumps and spikes in traffic.
Achieving 50% efficiency is good, but very spiky traffic patterns
may use less than 30%. In these scenarios, On Demand mode will be less expensive.
You may adjust the efficiency level and other model parameters via the green cells in column C.

For specific jobs, such as a large data import, you may want to know just the write costs.
Imagine a job that performs 2500 writes per second and takes three hours. You can adjust
the time period in C9 and C10 and WCU per second velocity in C17 to show the write costs
for a specific workload like this.

An existing table in DynamoDB can be promoted to a Global Table by adding a new region to the table.
When moving to a two-region Global Table, storage costs and write costs will double. 
Multi Region Strongly Consistent tables use three regions.
These prices will be modeled by choosing a Global Table type in cell C12.

The unit prices shown on rows 4-7 are the current list prices for a table in us-east-1.
Because prices may change in the future, you can adjust these as needed, or for a specific region.

The tool helps you model the core costs of a table,
please refer to the [DynamoDB Pricing Page](https://aws.amazon.com/dynamodb/pricing/)
for a full list of DynamoDB features, options and prices.

---

**Note:** This template was migrated from the [amazon-dynamodb-tools](https://github.com/awslabs/amazon-dynamodb-tools) repository as part of [issue #207](https://github.com/aws-samples/aws-dynamodb-examples/issues/207).
