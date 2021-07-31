using System;
using System.Collections.Generic;

using System.Threading.Tasks;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using System.Linq;

namespace DotnetSamples.WorkingWithItems
{
    public class TransactWriteItems
    {
        /// <summary>
        /// Example that writes items in a transaction to a DynamoDB
        /// </summary>
        /// <returns></returns>
        public static async Task TransactWriteItemsExample()
        {

            var client = new AmazonDynamoDBClient(RegionEndpoint.USWest2);

            //Creation of the request. As an example, we will put an item on a secondary table, delete it from the original table and update the status on a third table if the current status is active
            var request = new TransactWriteItemsRequest()
            {
                TransactItems = new List<TransactWriteItem>()
                {       
                        //Put
                        new TransactWriteItem()
                        {
                            Put  = new Put()
                            {
                                TableName = "RetailDatabase2",
                                Item = new Dictionary<string, AttributeValue>
                                        {
                                            {"pk", new AttributeValue("vikram.johnson@somewhere.com")},
                                            {"sk", new AttributeValue("metadata")},
                                            {"attribute1",new AttributeValue("Attribute1 value")  }
                                            //Add more attributes
                                        }
                            }
                        },
                        //Delete
                        new TransactWriteItem()
                        {
                            Delete = new Delete()
                            {
                                TableName = "RetailDatabase",
                                Key = new Dictionary<string, AttributeValue>
                                        {
                                            {"pk", new AttributeValue("vikram.johnson@somewhere.com")},
                                            {"sk", new AttributeValue("metadata")},
                                        },
                                //You could add conditional expresions if you need it
                            }
                        },
                        
                        //Update
                        new TransactWriteItem()
                        {
                            Update = new Update()
                            {
                                TableName = "CustomerStatus",
                                Key = new Dictionary<string, AttributeValue>
                                {
                                    { "pk", new AttributeValue("vikram.johnson@somewhere.com") },
                                },
                                //We update the #s (status attribute) if the condition is meeted
                                UpdateExpression = "set #s = :arch",
                                ConditionExpression = "#s = :a",
                                ExpressionAttributeNames = new Dictionary<string, string>
                                {
                                { "#s", "status" },
                                },
                                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                                {
                                    { ":a", new AttributeValue("active") },
                                    { ":arch", new AttributeValue("archived") },
                                },
                            }
                        }
                    },
                    ReturnItemCollectionMetrics = "SIZE", //Statistics disabled by default with NONE, you could use SIZE to know statistics of the modifed items.
                    ReturnConsumedCapacity = "TOTAL"
            };

            try
            {
                var response = await client.TransactWriteItemsAsync(request);
                Console.WriteLine($" Action finished with code: {response.HttpStatusCode}, info: {response.ItemCollectionMetrics.ToString()} ");
            }
            catch (TransactionCanceledException cancelation)
            {
                //We catch the error raised when the transaction is cancelled.
                Console.WriteLine($"Transaction Cancelled: {string.Join(string.Empty, cancelation.CancellationReasons.Where(c=> c != null).Select(c=> c.Message))}"); //We show a message that list the conditions not met
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
            }

        }
    }
}
