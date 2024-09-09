using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
    public class UpdateItem
    {
        private readonly IAmazonDynamoDB amazonDynamoDB;

        public UpdateItem()
        {
            amazonDynamoDB = new AmazonDynamoDBClient(RegionEndpoint.USWest2);
        }

        public UpdateItem(IAmazonDynamoDB amazonDynamoDB)
        {
            this.amazonDynamoDB = amazonDynamoDB;
        }

        public async Task ServiceClientExampleAsync()
        {
            try
            {
                // Define the name of a user account to update. Note that in this example, we have to alias "name" using ExpressionAttributeNames as name is a reserved word in DynamoDB.
                var request = new UpdateItemRequest
                {
                    TableName = "RetailDatabase",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "pk", new AttributeValue("jim.bob@somewhere.com") },
                        { "sk", new AttributeValue("metadata") },
                    },
                    UpdateExpression = "set #n = :nm",
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        { "#n", "name" },
                    },
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":nm", new AttributeValue("Big Jim Bob") },
                    },
                    ReturnValues = ReturnValue.ALL_NEW
                };

                var response = await amazonDynamoDB.UpdateItemAsync(request);
                Console.WriteLine($"UpdateItem succeeded.");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
                throw;
            }
        }
    }
}
