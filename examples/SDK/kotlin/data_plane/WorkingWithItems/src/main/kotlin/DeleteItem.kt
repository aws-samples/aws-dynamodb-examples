import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.deleteItem
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue

suspend fun deleteItem(
    tableName: String,
    key: Map<String, AttributeValue>,
) {
    DynamoDbClient { region = "us-west-2" }.use { ddb ->
        ddb.deleteItem {
            this.tableName = tableName
            this.key = key
        }
        println("Deleted item with the given key.")
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    val key = mapOf("PrimaryKey" to AttributeValue.S("YourPrimaryKeyValue"))

    deleteItem(tableName, key)
}
