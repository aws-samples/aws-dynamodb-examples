using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
    class GetItem
    {
        public static async Task ServiceClientExampleAsync()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USWest2);

                var request = new GetItemRequest
                {
                    TableName = "RetailDatabase",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        {"pk",  new AttributeValue {S = "jim.bob@somewhere.com"} },
                        {"sk",  new AttributeValue {S = "metadata"} }
                    }
                };

                var response = await client.GetItemAsync(request);
                Console.WriteLine($"Item retrieved with {response.Item.Count} attributes.");        
            }
            catch(Exception e)
            {
                Console.Error.WriteLine(e.Message);
            }
        }
    }
}
