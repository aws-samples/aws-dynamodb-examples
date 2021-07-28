using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;


namespace DotnetSamples.WorkingWithItems
{
    public class BatchGetItem
    {

        public static async Task ServiceClientExampleAsync()
        {
            
            var client = new AmazonDynamoDBClient(RegionEndpoint.USWest2);
            var request = new BatchGetItemRequest
                {
                    RequestItems = new Dictionary<string, KeysAndAttributes> {
                        {
                            //Table to read 
                            "RetailDatabase",
                            //Definition of the keys to retrieve
                            new KeysAndAttributes
                            {
                                Keys = new List<Dictionary<string, AttributeValue>>
                                {
                                    //List of dictionaries that define the keys of the items to retrieve
                                    new Dictionary<string, AttributeValue> {
                                                                            { "pk", new AttributeValue { S = "jim.bob@somewhere.com" }},
                                                                            { "sk", new AttributeValue { S = "metadata" }} 
                                                                           },

                                    new Dictionary<string, AttributeValue> {
                                                                            { "pk", new AttributeValue { S = "vikram.johnson@somewhere.com" }},
                                                                            { "sk", new AttributeValue { S = "metadata" }}
                                                                           },
                                    new Dictionary<string, AttributeValue> {
                                                                            { "pk", new AttributeValue { S = "jose.schneller@somewhere.com" }},
                                                                            { "sk", new AttributeValue { S = "metadata" }}
                                                                           }
                                },
                                ConsistentRead = true, //If you don't need consistent reads use false instead to have cheaper retrieve prices
                            }
                        }   //You can add more tables to read here.
                    },
                    ReturnConsumedCapacity = "TOTAL"
                };

            try
            {
                //Execute the BatchGet task to obtain the data
                var responseBatch =await client.BatchGetItemAsync(request);
                
                //Read every table and show all the content retrieved from the table.
                foreach(var table in responseBatch.Responses)
                {
                    Console.WriteLine($"Results of table {table.Key}: number {table.Value.Count}");
                    Console.WriteLine(JsonConvert.SerializeObject(table.Value));
                }
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
            }


        }

    }
}