import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.batchGetItem
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.KeysAndAttributes

suspend fun batchGetItem(
    tableName: String,
    keys: List<Map<String, AttributeValue.S>>,
) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->
        val response =
            ddb.batchGetItem {
                this.requestItems =
                    mapOf(
                        tableName to
                            KeysAndAttributes {
                                this.keys = keys
                            },
                    )
            }

        response.responses?.forEach { (tableName, items) ->
            println("Items from table $tableName:")
            items.forEach { item ->
                println(item)
            }
        }

        response.unprocessedKeys?.let { unprocessedKeys ->
            if (unprocessedKeys.isNotEmpty()) {
                println("Unprocessed keys:")
                println(unprocessedKeys)
            }
        }
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    val keys =
        listOf(
            mapOf("id" to AttributeValue.S("12345")),
            mapOf("id" to AttributeValue.S("1234")),
        )

    batchGetItem(tableName, keys)
}
