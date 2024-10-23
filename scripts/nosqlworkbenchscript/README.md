# 🚀 Export Amazon DynamoDB Tables to NoSQL Workbench

This guide will help you export the schema and first 1MB of data from an existing DynamoDB table using the script **create-workbench-import.js**. The script's JSON output can be imported into [NoSQL Workbench for Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html) to create the table and populate the data within NoSQL Workbench. 

## 🏃 How to Get Started

1. **Download Script**
   
   Copy the `create-workbench-import.js` file to the folder you wish to run it from.

2. **Install Node.js**

   Make sure you’ve got Node.js installed on your machine.  
   👉 [Get Node.js here](https://nodejs.org/en)

3. **Install AWS SDK for JavaScript**

   Make sure you’ve got AWS SDK for JavaScript installed on your machine.  
   👉 [Get AWS SDK for JavaScript here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/installing-jssdk.html)

4. **Modify the Region in the Script**  

   You may need to modify line 13 in the script and update the region name to the appropriate AWS Region for your existing DynamoDB table.  
   ```
   AWS.config.region = process.env.AWS_REGION || 'us-east-1';
   ```
6. **Credentials**  

   This script relies on the credentials in `~/.aws` to authenticate. You should run it with a credential that has read only access to the table.

8. **Run the Script**  

   Open a terminal, navigate to the script folder, and run the below command, replacing "YourTableNameHere" with your existing DynamoDB table name.  
   ```
   node create-workbench-import.js YourTableNameHere > YourTableNameHere.json
   ```  
   The command directs the JSON output to `YourTableNameHere.json`

   If you wish to direct the output to stdout instead of a file, leave off the `> YourTableNameHere.json` in the command.

   ```
   node create-workbench-import.js YourTableNameHere
   ```

10. **Use the JSON File to Import into NoSQL Workbench**   

    Once you have the JSON file from your table, you can perform a "import data model" in NoSQL Workbench to bring it into the tool.  
       \
       \
       \
    Initial script by [Rob McCauley](https://github.com/robm26).  

    This script is provided as is and at your own risk. There are no guarantees expressly written or implied.
