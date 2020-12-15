using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
    public class UpdateItemConditional
    {
        private readonly IAmazonDynamoDB amazonDynamoDB;

        public UpdateItemConditional()
        {
            amazonDynamoDB = new AmazonDynamoDBClient(RegionEndpoint.USWest2);
        }

        public UpdateItemConditional(IAmazonDynamoDB amazonDynamoDB)
        {
            this.amazonDynamoDB = amazonDynamoDB;
        }

        public async Task ServiceClientExampleAsync()
        {
            try
            {
                // Define the name of a user account to update. Note that in this example, we have to alias "name" using ExpressionAttributeNames as name is a reserved word in DynamoDB.
                // Notice also the conditional expression where it will only update if the age is greater than or equal to 21
                var request = new UpdateItemRequest
                {
                    TableName = "RetailDatabase",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "pk", new AttributeValue("jim.bob@somewhere.com") },
                        { "sk", new AttributeValue("metadata") },
                    },
                    UpdateExpression = "set #n = :nm",
                    ConditionExpression = "age >= :a",
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        { "#n", "name" },
                    },
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":nm", new AttributeValue("Big Jim Bob") },
                        { ":a", new AttributeValue { N = "21" } },
                    },
                    ReturnValues = ReturnValue.ALL_NEW
                };

                var response = await amazonDynamoDB.UpdateItemAsync(request);
                Console.WriteLine($"UpdateItemConditional succeeded.");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
                throw;
            }
        }
    }
}
