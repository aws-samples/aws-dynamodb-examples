using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithItems
{
 
    public class TransactGetItems
    {
        /// <summary>
        /// Example that gets items in a transaction from DynamoDB
        /// </summary>
        /// <returns></returns>
        public static async Task TransactGetItemsExample()
        {
            
            var client = new AmazonDynamoDBClient(RegionEndpoint.USWest2);

            var request = new TransactGetItemsRequest
            {
                //Up to 25 Items to retrieve from one or more tables but from one or more indexes for a same table.
                TransactItems = new List<TransactGetItem>
                {
                    new TransactGetItem()
                    {
                        Get = new Get()
                                {
                                    TableName = "RetailDatabase",

                                    Key = new Dictionary<string, AttributeValue>
                                                {
                                                    { "pk", new AttributeValue { S = "jim.bob@somewhere.com" }},
                                                    { "sk", new AttributeValue { S = "metadata" }}
                                                },
                                    ProjectionExpression = "pk,sk", //Specific attributes to retrieve from the table separated by comas if empty all will be returned
                                }
                    },
                    new TransactGetItem()
                    {
                        Get = new Get()
                                {
                                    TableName = "RetailDatabase",

                                    Key = new Dictionary<string, AttributeValue>
                                                {
                                                    { "pk", new AttributeValue { S = "jose.schneller@somewhere.com" }},
                                                    { "sk", new AttributeValue { S = "metadata" }}
                                                },
                                }
                    }
                },
                ReturnConsumedCapacity = "TOTAL"
            };

            try
            {
                
                var responseTransaction = await client.TransactGetItemsAsync(request);


                foreach (var item in responseTransaction.Responses)
                {
                    foreach(var attribute in item.Item)
                    {
                        Console.WriteLine($"{attribute.Key} : { attribute.Value.S}"); // For the example I'm supposing all the values are string, use the type property that corresponds
                    }
                    Console.WriteLine(string.Empty);
                }
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
            }
            


        }
    }
}