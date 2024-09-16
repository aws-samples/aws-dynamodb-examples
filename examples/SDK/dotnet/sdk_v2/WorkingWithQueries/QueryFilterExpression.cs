using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithQueries
{
    public class QueryFilterExpression
    {
        public static async Task FilterExpressionDbClientExampleAsync()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
                var request = new QueryRequest
                {
                    TableName="MyTableName",
                    KeyConditionExpression="PK = :pk",
                    FilterExpression="CustomerName = :cn",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":pk", new AttributeValue { S="Customer1" } },
                        { ":cn", new AttributeValue { S="John Smith" }}
                    },
                };

                var response = await client.QueryAsync(request); 

                Console.WriteLine("Success"); 
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex.Message);
            }          
        }
    }
}