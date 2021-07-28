using System;
using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using System.Collections.Generic;

namespace DotnetSamples.WorkingWithItems
{

    public class BatchWriteItem
    {
        /// <summary>
        /// Example that writes to a DynamoDb more than one item in one call.
        /// </summary>
        /// <returns></returns>
        public static async Task BatchWriteExampleAsync()
        {
            //Create Client
            var client = new AmazonDynamoDBClient(RegionEndpoint.USWest2);

            //Definition of the first item to put on a table
            var putFirstItem = new PutRequest(new Dictionary<string, AttributeValue>
                                        {
                                            {"pk", new AttributeValue("jim.bob@somewhere.com")},
                                            {"sk", new AttributeValue("metadata")},
                                            {"attribute1",new AttributeValue("Attribute1 value")  }
                                            //Add other attributes as you need 
                                        }
                                        );
            //Definition of the second item to put on a table
            var putSecondItem = new PutRequest(new Dictionary<string, AttributeValue>
                                        {
                                            {"pk", new AttributeValue("jose.schneller@somewhere.com")},
                                            {"sk", new AttributeValue("metadata")},
                                            {"attribute1",new AttributeValue("Attribute1 value")  }
                                            //Add other attributes as you need 
                                        }
                                       );
            //Definition of an item to delete
            var deleteItem = new DeleteRequest(new Dictionary<string, AttributeValue>
                                        {
                                            {"pk", new AttributeValue("vikram.johnson@somewhere.com")},
                                            {"sk", new AttributeValue("metadata")},
                                        }
                                        );

            //Request that group all the previous Put & Delete actions
            var writeRequest = new BatchWriteItemRequest
            {
                RequestItems = new Dictionary<string, List<WriteRequest>>
                { 
                    { 
                        //Name of the table
                        "RetailDatabase",
                        new List<WriteRequest>()
                            {
                                new WriteRequest(putFirstItem),
                                new WriteRequest(putSecondItem),
                                new WriteRequest(deleteItem)
                            }
                    },//You can execute other collections of requests on other tables at the same time
                    {
                        //Name of the table
                        "RetailDatabase2",
                        new List<WriteRequest>()
                            {
                                new WriteRequest(putFirstItem),
                                new WriteRequest(putSecondItem),
                                new WriteRequest(deleteItem)
                            }
                    }
                }
            };

            try
            {
                //Execution of the request
                var responseWrite = await client.BatchWriteItemAsync(writeRequest);
                
                Console.WriteLine($"Status {responseWrite.HttpStatusCode}");
                Console.WriteLine($"Number of items not processed that you need to try again:{responseWrite.UnprocessedItems}");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
            }

        }


    }
}