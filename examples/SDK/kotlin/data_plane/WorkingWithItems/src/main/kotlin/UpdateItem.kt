import aws.sdk.kotlin.services.dynamodb.DynamoDbClient
import aws.sdk.kotlin.services.dynamodb.model.AttributeAction
import aws.sdk.kotlin.services.dynamodb.model.AttributeValue
import aws.sdk.kotlin.services.dynamodb.model.AttributeValueUpdate
import aws.sdk.kotlin.services.dynamodb.model.UpdateItemRequest
import aws.sdk.kotlin.services.dynamodb.updateItem

suspend fun updateItem(
    tableName: String,
    id: String,
    newEmail: String,
) {
    DynamoDbClient { region = "us-west-2" }.use { dynamoDb ->
        dynamoDb.updateItem {
            UpdateItemRequest {
                this.tableName = tableName
                this.key = mapOf("PrimaryKey" to AttributeValue.S(id))
                this.attributeUpdates =
                    mapOf(
                        "email" to
                            AttributeValueUpdate {
                                this.action = AttributeAction.Put
                                this.value = AttributeValue.S(newEmail)
                            },
                    )
            }
        }
        println("Item updated")
    }
}

suspend fun main() {
    val tableName = "YourTableName"
    updateItem(tableName, id = "1234", newEmail = "new@example.com")
}
