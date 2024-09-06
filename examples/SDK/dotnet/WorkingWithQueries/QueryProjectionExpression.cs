using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithQueries
{
    public class QueryProjectionExpression
    {
        public async Task QueryProjectionExpressionDbClientExmaple()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
                var request = new QueryRequest
                {
                    TableName="MyTableName",
                    ProjectionExpression="CustomerId, #cn",
                    ExpressionAttributeNames= new Dictionary<string, string>
                    {
                        { "#cn", "CustomerName" }
                    },
                    KeyConditionExpression="PK = :pk",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":pk", new AttributeValue { S="Customer1" } },
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