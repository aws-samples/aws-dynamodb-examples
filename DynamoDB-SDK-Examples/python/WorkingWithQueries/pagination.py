# snippet-sourcedescription:[ pagination through a list of items from a query ]
# snippet-service:[dynamodb]
# snippet-keyword:[Python]
# snippet-keyword:[Amazon DynamoDB]
# snippet-keyword:[Code Sample]
# snippet-keyword:[ Pagination]
# snippet-sourcetype:[full-example]
# snippet-sourcedate:[ ]
# snippet-sourceauthor:[AWS]
# snippet-start:[dynamodb.python.codeexample.pagination]

#
#  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
#  This file is licensed under the Apache License, Version 2.0 (the "License").
#  You may not use this file except in compliance with the License. A copy of
#  the License is located at
#
#  http://aws.amazon.com/apache2.0/
#
#  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
#  CONDITIONS OF ANY KIND, either express or implied. See the License for the
#  specific language governing permissions and limitations under the License.
#
from __future__ import print_function # Python 2/3 compatibility
import boto3, json, decimal

from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError