Implementation plan

Tasks:
- [ ] 0. Set up Git source control for the project. 
  - Initialize GIT at the root of this workspace so you have a point to revert your changes if needed in the future. 
  - You must always use git -P to avoid getting stuck in git operations.
  - The subfolders have compiled projects, make sure to create a gitignore so you track only what you will be modifying not the complied version or the node_modules. 
  - Use a temporary file called `artifacts/0_working_log.md` so you can track what is your current work and important notes and use it as a reference.
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done. 
  - Commit the latest changes registered in the working log and other artifacts.

- [ ] 1. Read MySQL source database information.
  - Make sure you have a clean commit log. 
  - From the database/ folder use the  the mysql_log_parser.py script to capture mysql query statistics. 
  - Use the MySQL MCP server to connect and collect the actual schema information deployed in the database, that will be used to understand the entity relationships.
  - Using both results generate a comprenhensive report where you explain the entity relationship information, table structure and add the access patterns at the bottom to understand the nature of the workload. DO NOT SUGGEST A DYNAMODB TABLE STRUCTURE.
  - Generate a file where you store the results of your investigation in `artifacts/` under the name `1_0_database_analysis.md`
  - Use a temporary file called `artifacts/1_working_log.md` so you can track what is your current work and important notes and use it as a reference.
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done. 

- [ ] 1.1 Identify current application access patterns
  - Make sure you have a clean commit log. 
  - From the backend/ folder use the README.md to understand its API endpoint.
  - Explore the backend/ folder to understand in detail the available access patterns.
  - Generate a file where you store the results of your investigation in `artifacts/` under the name `1_1_API_access_patterns.md`.
  - Use a temporary file called `artifacts/1_working_log.md` so you can track what is your current work and important notes and use it as a reference.
  - The result of the API access patterns must include a detailed explanation on the relationship between the different entities.
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done. 

- [ ] 1.2. Generate a DynamoDB data model.
  - Make sure you have a clean commit log. 
  - Use the results from the previous steps stored in the folder `artifacts/` that begin with `1_**.md`, i.e: `1_0_database_analysis.md` and `1_1_API_access_patterns.md`.
  - Use the prompt available in `prompts/dynamodb_architect.md` to understand how to formulate a proper DynamoDB data model, follow its instructions. 
  - Instead of just prompting out the answer to the user, please chat with the user and validate if the suggested data model fit their needs. 
  - Use a temporary file called `artifacts/1_working_log.md` so you can track what is your current work and important notes and use it as a reference.
  - This task can only be completed if the user accepts the data model and it doesn't has any more feedback or questions about it, please ask until you get a confirmation.


