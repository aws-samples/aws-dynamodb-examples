import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.getItem
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue

suspend fun getItem(
    tableName: String,
    key: Map<String, AttributeValue>,
) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->
        val response =
            ddb.getItem {
                this.tableName = tableName
                this.key = key
            }

        response.item?.let {
            println("Item: $it")
        } ?: println("No item found with the given key.")
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    val key = mapOf("id" to AttributeValue.S("1234"))

    getItem(tableName, key)
}
