using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
    public class PutItem
    {
        private readonly IAmazonDynamoDB amazonDynamoDB;

        public PutItem()
        {
            amazonDynamoDB = new AmazonDynamoDBClient(RegionEndpoint.USWest2);
        }

        public PutItem(IAmazonDynamoDB amazonDynamoDB)
        {
            this.amazonDynamoDB = amazonDynamoDB;
        }

        public async Task ServiceClientExampleAsync()
        {
            try
            {
                var request = new PutItemRequest
                {
                    TableName = "RetailDatabase",
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { "pk", new AttributeValue("jim.bob@somewhere.com") },
                        { "sk", new AttributeValue("metadata") },
                        { "name", new AttributeValue("Jim Bob") },
                        { "first_name", new AttributeValue("Jim") },
                        { "last_name", new AttributeValue("Bob") },
                        {
                            "address",
                            new AttributeValue
                            {
                                M = new Dictionary<string, AttributeValue>
                                {
                                    { "road", new AttributeValue("456 Nowhere Lane") },
                                    { "city", new AttributeValue("Langely") },
                                    { "state", new AttributeValue("WA") },
                                    { "pcode", new AttributeValue("98260") },
                                    { "country", new AttributeValue("USA") },
                                }
                            }
                        },
                        { "username", new AttributeValue("jbob") },
                    }
                };

                var response = await amazonDynamoDB.PutItemAsync(request);
                Console.WriteLine($"PutItem succeeded.");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
                throw;
            }
        }
    }
}
