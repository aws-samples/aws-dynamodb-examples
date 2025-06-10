import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.batchWriteItem
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.PutRequest
import aws.sdk.kotlin.services.dynamodb.model.WriteRequest

suspend fun batchWriteItem(
    tableName: String,
    items: List<Map<String, String>>,
) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->

        val putRequests =
            items.map { item ->
                val itemValues = item.mapValues { (_, value) -> AttributeValue.S(value) }
                WriteRequest {
                    this.putRequest =
                        PutRequest {
                            this.item = itemValues
                        }
                }
            }

        val response =
            ddb.batchWriteItem {
                this.requestItems =
                    mapOf(
                        tableName to putRequests,
                    )
            }

        response.unprocessedItems?.let { unprocessedKeys ->
            if (unprocessedKeys.isNotEmpty()) {
                println("Unprocessed keys:")
                println(unprocessedKeys)
            }
        }
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    val items =
        listOf(
            mapOf(
                "id" to "1234",
                "name" to "John Doe",
                "email" to "john.doe@example.com",
            ),
            mapOf(
                "id" to "1235",
                "name" to "Jane Doe",
                "email" to "jane.doe@example.com",
            ),
        )

    batchWriteItem(tableName, items)
}
