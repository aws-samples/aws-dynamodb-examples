using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithQueries
{
    public class QueryCount
    {
        public static async Task CountDbClientExampleAsync()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
                var request = new QueryRequest
                {
                    TableName="MyTableName",
                    KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":pk", new AttributeValue { S="Customer1" } },
                        { ":sk", new AttributeValue { S="ORDER|"} }
                    }
                };

                var response = await client.QueryAsync(request);
                
                Console.WriteLine($"The query has scanned {response.ScannedCount} items and returned ${response.Count} items in total");
            }
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }
        }
    }
}