# Export Amazon DynamoDB Tables to NoSQL Workbench

This directory contains a node.js script that when run, will export a table's meta data and the first 1MB worth of data into a format that can be imported into [NoSQL Workbench for Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html).

You will need to modify the script to add the Amazon Web Services Region you want to export. This script relies on the credentials in ~/.aws to authenticate. The command directs the json output to stdout.

`node create-workbench-import.js YourTableNameHere > YourTableNameHere.json`

Once you have the JSON file from your table, you can perform a "import data model" in NoSQL Workbench to bring it into the tool.

Initial script by [Rob McCauley](https://github.com/robm26).
