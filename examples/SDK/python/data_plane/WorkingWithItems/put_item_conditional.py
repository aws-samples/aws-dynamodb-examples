from __future__ import print_function  # Python 2/3 compatibility
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb", region_name="us-west-2")
table = dynamodb.Table("RetailDatabase")


def create_item_if_not_exist(created_at):
    try:
        table.put_item(
            Item={
                "pk": "jim.bob@somewhere.com",
                "sk": "metadata",
                "name": "Jim Bob",
                "first_name": "Jim",
                "last_name": "Bob",
                "created_at": created_at,
            },
            # If this item exists, then an item exists with this pk and/or sk so we should fail if
            # we see a matching item with this pk.
            ConditionExpression=Attr("pk").not_exists(),
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        print("PutItem failed since the item already exists")
        return False

    print("PutItem succeeded")
    return True


def get_created_at(email):
    response = table.get_item(
        Key={"pk": email, "sk": "metadata"},
        AttributesToGet=["created_at"],
    )
    return response.get("Item", {}).get("created_at")


print("The first PutItem should succeed because the item does not exist")
assert create_item_if_not_exist(100)

print("The same PutItem command should now fail because the item already exists")
assert not create_item_if_not_exist(200)

assert get_created_at("jim.bob@somewhere.com") == 100
print("As expected, The second PutItem command failed and the data was not overwritten")
