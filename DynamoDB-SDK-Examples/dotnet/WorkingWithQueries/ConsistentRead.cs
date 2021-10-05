using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;

namespace DotnetSamples.WorkingWithQueries
{
    public class CustomerOrder
    {
        public string PK { get; set; }
        public string SK { get; set; }
        public string CustomerName { get; set; }
        public string OrderName { get; set; }
    }
    public class ConsistentRead
    {
        public static async Task ConsistenReadExampleAsync()
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

                var queryResult = context.FromQueryAsync<CustomerOrder>(queryOperationConfig);
                var results = await queryResult.GetRemainingAsync();
            } 
            catch(Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }

        }
    }
}