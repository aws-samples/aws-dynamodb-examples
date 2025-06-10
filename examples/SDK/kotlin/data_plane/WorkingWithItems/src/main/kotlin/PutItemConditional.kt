import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.putItem

suspend fun putItemConditional(
    tableName: String,
    item: Map<String, String>,
) {
    val itemValues = item.mapValues { (_, value) -> AttributeValue.S(value) }

    DynamoDbClient { region = "us-west-2" }.use { dynamoDb ->
        dynamoDb.putItem {
            this.tableName = tableName
            this.item = itemValues
            this.conditionExpression = "attribute_not_exists(id)"
        }
        println("Item successfully added to table $tableName")
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    val item =
        mapOf(
            "id" to "1234",
            "name" to "John Doe",
            "email" to "john.doe@example.com",
        )

    putItemConditional(tableName, item)
}
