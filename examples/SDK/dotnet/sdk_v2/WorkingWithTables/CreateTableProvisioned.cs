using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace DotnetSamples.WorkingWithTables
{
    public class CreateTableProvisioned
    {
        public static async Task CreateTable()
        {
            var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);

            var attributeDefinitions = new List<AttributeDefinition>
            {
                { 
                    new AttributeDefinition 
                    {
                        AttributeName="PK",
                        AttributeType="S"
                    }
                },
                {
                    new AttributeDefinition
                    {
                        AttributeName="SK",
                        AttributeType="S"
                    }
                }
            };

            var tableKeySchema = new List<KeySchemaElement>
            {
                {
                    new KeySchemaElement
                    {
                        AttributeName="PK",
                        KeyType="HASH"
                    }
                },
                {
                    new KeySchemaElement
                    {
                        AttributeName="SK",
                        KeyType="RANGE"
                    }
                }
            };

            var createTableRequest = new CreateTableRequest
            {
                TableName="MyTable",
                ProvisionedThroughput = new ProvisionedThroughput
                {
                    ReadCapacityUnits=(long)20,
                    WriteCapacityUnits=(long)10
                },
                AttributeDefinitions=attributeDefinitions,
                KeySchema=tableKeySchema
            };

            try
            {
                await client.CreateTableAsync(createTableRequest);
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }
    }
}