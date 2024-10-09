import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.TransactWriteItem
import aws.sdk.kotlin.services.dynamodb.transactWriteItems

suspend fun transactPutItem(requestsPerTable: Map<String, Map<String, String>>) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->
        ddb.transactWriteItems {
            this.transactItems =
                requestsPerTable.map { (table, requests) ->
                    TransactWriteItem {
                        this.put {
                            this.tableName = table
                            this.item = requests.mapValues { (_, value) -> AttributeValue.S(value) }
                        }
                    }
                }
        }
    }
}

suspend fun main() {
    val tableName1 = "YourTableName"
    val tableName2 = "YourTableName2"

    val requests =
        mapOf(
            tableName1 to
                mapOf(
                    "id" to "1234",
                    "name" to "John Doe",
                    "email" to "john.doe@example.com",
                ),
            tableName2 to
                mapOf(
                    "order" to "5678",
                    "customer" to "1234",
                ),
        )
    transactPutItem(requests)
}
