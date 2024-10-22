import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.UpdateItemRequest
import aws.sdk.kotlin.services.dynamodb.updateItem

suspend fun updateItemConditional(
    tableName: String,
    id: String,
    newPrice: Long,
) {
    DynamoDbClient { region = "us-west-2" }.use { dynamoDb ->
        val updateExpression = "SET #attr = :val"
        val conditionExpression = "#attr < :threshold"
        val expressionAttributeNames = mapOf("#attr" to "price")
        val expressionAttributeValues =
            mapOf(
                ":val" to AttributeValue.N(newPrice.toString()),
                ":threshold" to AttributeValue.N("5000"),
            )

        dynamoDb.updateItem {
            UpdateItemRequest {
                this.tableName = tableName
                this.key = mapOf("PrimaryKey" to AttributeValue.S(id))
                this.conditionExpression = conditionExpression
                this.updateExpression = updateExpression
                this.expressionAttributeNames = expressionAttributeNames
                this.expressionAttributeValues = expressionAttributeValues
            }
        }
        println("Item updated")
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    updateItemConditional(tableName, id = "product_id_1", newPrice = 500)
}
