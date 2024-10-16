from __future__ import print_function  # Python 2/3 compatibility
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb", region_name="us-west-2")
table = dynamodb.Table("RetailDatabase")


class ConditionalCheckFailedError(Exception):
    """
    An error indicating that a DynamoDB conditional check failed.
    Wrapped as a separate error for readability.
    """


def delete_item(email):
    response = table.delete_item(
        Key={
            "pk": email,
            "sk": "metadata",
        },
    )


def create_user(email, name):
    initial_change_version = 0

    try:
        table.put_item(
            Item={
                "pk": email,
                "sk": "metadata",
                "name": name,
                "change_version": initial_change_version,
            },
            ConditionExpression=Attr("pk").not_exists(),
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException as e:
        raise ConditionalCheckFailedError() from e

    return initial_change_version


def update_name(email, name, last_change_version):
    try:
        response = table.update_item(
            Key={"pk": email, "sk": "metadata"},
            UpdateExpression="SET #n = :nm, #cv = #cv + :one",
            ExpressionAttributeNames={"#n": "name", "#cv": "change_version"},
            ExpressionAttributeValues={":nm": name, ":one": 1},
            ReturnValues="UPDATED_NEW",
            ConditionExpression=Attr("change_version").eq(last_change_version),
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException as e:
        raise ConditionalCheckFailedError() from e

    return int(response.get("Attributes", {}).get("change_version"))


def get_user(email):
    response = table.get_item(
        Key={"pk": email, "sk": "metadata"},
        AttributesToGet=["name", "change_version"],
    )
    return {
        "email": email,
        "name": response["Item"]["name"],
        "change_version": int(response["Item"]["change_version"]),
    }


def main():
    delete_item("jim.bob@somewhere.com")

    print("Creating an item with change_version = 0")
    last_change_version = create_user("jim.bob@somewhere.com", "Jim Bob")
    current_user = get_user("jim.bob@somewhere.com")
    print("current_user = ", current_user)

    print("Change the user's name")
    last_change_version = update_name(
        "jim.bob@somewhere.com", "Jim Roberts", last_change_version
    )
    current_user = get_user("jim.bob@somewhere.com")
    print("current_user = ", current_user)

    print(
        "Try to update the name with an old change_version imitating a race condition"
    )
    try:
        last_change_version = update_name(
            "jim.bob@somewhere.com", "Jonathan Roberts", last_change_version - 1
        )
    except ConditionalCheckFailedError:
        print("Yup, this failed as expected, the user information did not change")
    else:
        raise RuntimeError("This should have failed")

    current_user = get_user("jim.bob@somewhere.com")
    print("current_user = ", current_user)


if __name__ == "__main__":
    main()
