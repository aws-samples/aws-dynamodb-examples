using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithQueries
{
    public class QueryConsumedCapacity
    {
        public static async Task ConsumedCapacityDbClientExampleAsync()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
                var request = new QueryRequest
                {
                    TableName="MyTableName",
                    ConsistentRead=true,
                    KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":pk", new AttributeValue { S="Customer1" } },
                        { ":sk", new AttributeValue { S="ORDER|"} }
                    }
                };

                var response = await client.QueryAsync(request);

                Console.WriteLine($"Consumed Read capacity is: {response.ConsumedCapacity.ReadCapacityUnits} Total Consumed Capacity is: {response.ConsumedCapacity.CapacityUnits}");
            }
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }            
        }
    }
}