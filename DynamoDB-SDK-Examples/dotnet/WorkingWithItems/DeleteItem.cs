using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
    public class DeleteItem
    {
        private readonly IAmazonDynamoDB amazonDynamoDB;

        public DeleteItem()
        {
            amazonDynamoDB = new AmazonDynamoDBClient(RegionEndpoint.USWest2);
        }

        public DeleteItem(IAmazonDynamoDB amazonDynamoDB)
        {
            this.amazonDynamoDB = amazonDynamoDB;
        }

        public async Task ServiceClientExampleAsync()
        {
            try
            {
                var request = new DeleteItemRequest
                {
                    TableName = "RetailDatabase",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        {"pk",  new AttributeValue {S = "jim.bob@somewhere.com"} },
                        {"sk",  new AttributeValue {S = "metadata"} }
                    }
                };

                var response = await amazonDynamoDB.DeleteItemAsync(request);
                Console.WriteLine($"DeleteItem succeeded.");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
                throw;
            }
        }
    }
}
