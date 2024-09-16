using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using DotnetSamples.Models;

namespace DotnetSamples.WorkingWithQueries
{
    public class QueryConsistentRead
    {
        public static readonly DynamoDBOperationConfig DB_CONFIG = 
                    new DynamoDBOperationConfig { OverrideTableName="MyTableName"};
        public static async Task ConsistenReadDbContextExampleAsync()
        {
            try
            {
                var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
                var context = new DynamoDBContext(client);

                var queryOperationConfig = new QueryOperationConfig();
                queryOperationConfig.ConsistentRead = true;
                var keyExpression = new Expression();
                keyExpression.ExpressionStatement = "PK=:pk and begins_with(SK, :sk)";
                keyExpression.ExpressionAttributeValues = new Dictionary<string, DynamoDBEntry>();
                keyExpression.ExpressionAttributeValues.Add(":pk", "Customer1");
                keyExpression.ExpressionAttributeValues.Add(":sk", "ORDER|");
                queryOperationConfig.KeyExpression = keyExpression;

                var queryResult = context.FromQueryAsync<CustomerOrder>(queryOperationConfig, DB_CONFIG);
                var results = await queryResult.GetRemainingAsync();

                Console.WriteLine("Success");
            } 
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }
        }

        public static async Task ConsistentReadClientExampleAsync()
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
            }
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }
        }
    }
}