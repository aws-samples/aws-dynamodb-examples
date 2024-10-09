import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.Get
import aws.sdk.kotlin.services.dynamodb.model.TransactGetItem
import aws.sdk.kotlin.services.dynamodb.transactGetItems

suspend fun transactGetItem(requestsPerTable: Map<String, Map<String, AttributeValue.S>>) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->
        val response =
            ddb.transactGetItems {
                this.transactItems =
                    requestsPerTable.map { (table, requests) ->
                        TransactGetItem {
                            this.get =
                                Get {
                                    this.tableName = table
                                    this.key = requests
                                }
                        }
                    }
            }

        response.responses?.forEach {
            println("found item $it")
        }
    }
}

suspend fun main() {
    val tableName1 = "YourTableName"
    val tableName2 = "YourTableName2"
    val requests =
        mapOf(
            tableName1 to mapOf("PrimaryKey1" to AttributeValue.S("YourPrimaryKeyValue1")),
            tableName2 to mapOf("PrimaryKey2" to AttributeValue.S("YourPrimaryKeyValue2")),
        )
    transactGetItem(requests)
}
