# MySQL Analysis - Tasks

**IMPORTANT**: 
- **Commit changes frequently** throughout this stage to maintain a clean Git history
- **Use `git -P`** to avoid interactive prompts
- **Mark tasks as completed** by changing `[ ]` to `[x]` as you finish each task
- **Commit after each major task completion** with descriptive messages
- **Update the tasks.md file** itself when marking tasks complete and commit those changes too
- **Use single working log**: Use `artifacts/stage-01/01_working_log.md` throughout the entire stage (not individual logs per subtask)
- **DO NOT MODIFY THE CONTENT OF THIS FILE**: Only add a [x] mark to complete the task, for tracking purposes.
- [ ] 0. Set up Git source control for the project
  - Initialize GIT at the root of this workspace so you have a point to revert your changes if needed in the future
  - You must always use git -P to avoid getting stuck in git operations
  - The subfolders have compiled projects, make sure to create a gitignore so you track only what you will be modifying not the compiled version or the node_modules
  - Use a temporary file called `artifacts/stage-01/01_working_log.md` to track your current work and important notes throughout this entire stage
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done
  - Commit the latest changes registered in the working log and other artifacts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1. Identify current application access patterns
  - Make sure you have a clean commit log
  - From the backend/ folder use the README.md to understand its API endpoints
  - Explore the backend/ folder to understand in detail the available access patterns
  - **CRITICAL**: This analysis defines the PRIMARY access patterns that MUST be supported in DynamoDB design
  - **CRITICAL**: These API patterns are the authoritative source for what the application needs to do
  - Generate a file where you store the results of your investigation in `artifacts/stage-01/` under the name `01_1_API_access_patterns.md`
  - Use the working log file `artifacts/stage-01/01_working_log.md` to track your current work and important notes
  - The result of the API access patterns must include:
    - Complete list of all API endpoints and their data access requirements
    - Detailed explanation on the relationship between the different entities
    - Enumerate the access patterns so it is easier to know how many the application will need to support
    - **Clear statement**: "These patterns represent ALL access patterns that must be supported in the DynamoDB design"
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done
  - _Requirements: 3.3, 4.2, 4.4_

- [ ] 2. Analyze MySQL database logs for performance data
  - Make sure you have a clean commit log
  - From the database/ folder use the mysql_log_parser.py script to capture mysql query statistics and performance data
  - **CRITICAL**: This analysis provides SUPPLEMENTAL performance metrics for the API patterns identified in task 1
  - **IMPORTANT**: Logs may not contain data for all API endpoints - this is expected and acceptable
  - **IMPORTANT**: The API patterns from task 1 are the complete requirements; logs provide performance context where available
  - Generate `artifacts/stage-01/01_2_mysql_log_analysis.md` with analysis focused on:
    - Query frequency and performance metrics for queries that appear in logs
    - Performance bottlenecks and slow queries identified from actual usage
    - RPS estimates based on log data WHERE AVAILABLE
    - **Explicit statement**: "This log analysis provides performance data for observed queries only. Complete access pattern requirements come from API analysis in task 1."
  - Use the working log file `artifacts/stage-01/01_working_log.md` to track your current work and important notes
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done
  - DO NOT SUGGEST A DYNAMODB TABLE STRUCTURE - focus only on current MySQL analysis
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 3. Extract complete table structure using MySQL MCP server
  - Make sure you have a clean commit log
  - Use the MySQL MCP server's execute_sql tool to run SQL queries and collect the actual schema information deployed in the database
  - Write and execute SQL queries to extract table structures, relationships, indexes, and constraints for the online shopping store database
  - **CRITICAL**: This analysis provides the COMPLETE data model that supports the API patterns from task 1
  - **CRITICAL**: This contains ALL entities, relationships, and data structures - even those not visible in logs
  - Generate `artifacts/stage-01/01_3_table_structure_analysis.md` with comprehensive documentation of:
    - Complete table definitions with columns, data types, and constraints for ALL tables
    - Primary keys, foreign keys, and indexes for the complete schema
    - Entity relationships and cardinalities for all entities
    - Current database schema structure showing the complete data model
    - **Clear statement**: "This represents the complete source data model that must be migrated to DynamoDB"
  - Use the working log file `artifacts/stage-01/01_working_log.md` to track your current work and important notes
  - DO NOT SUGGEST A DYNAMODB TABLE STRUCTURE - focus only on current MySQL analysis
  - Update the file task.md once completed, please let the user know that you have completed this task and summarize what has been done
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.1, 4.3, 4.5_

## Output Validation Checklist

Before marking this stage complete, verify:
- [ ] Git repository initialized with proper .gitignore
- [ ] Single working log file created: `artifacts/stage-01/01_working_log.md`
- [ ] **Three essential artifacts created**:
  - [ ] `artifacts/stage-01/01_1_API_access_patterns.md` - Backend API endpoints and access patterns from API specifications
  - [ ] `artifacts/stage-01/01_2_mysql_log_analysis.md` - Performance patterns and query statistics from mysql_log_parser.py
  - [ ] `artifacts/stage-01/01_3_table_structure_analysis.md` - Complete table structures and relationships from MySQL MCP server
- [ ] **API analysis defines PRIMARY access patterns**: Complete list of all API endpoints that must be supported in DynamoDB
- [ ] **MySQL log analysis provides SUPPLEMENTAL performance data**: RPS estimates and performance metrics where available in logs
- [ ] **Table structure analysis provides COMPLETE data model**: All entities, relationships, and constraints from the source database
- [ ] API patterns clearly marked as authoritative requirements for DynamoDB design
- [ ] Log analysis explicitly notes it may not cover all API patterns
- [ ] Table structure includes complete schema documentation for migration
- [ ] Documentation focuses on current state analysis without DynamoDB suggestions
- [ ] All changes are committed to Git with meaningful messages

## Troubleshooting Guide

**Git Setup Issues:**
- Ensure Git is installed and configured
- Use git -P flag to avoid interactive prompts
- Check .gitignore covers node_modules, dist/, build/, coverage/ directories
- Verify artifacts/ directory is tracked but build outputs are ignored

**MySQL Log Parser Issues:**
- Verify mysql_log_parser.py exists in database/ folder
- Check if MySQL log files are available for analysis
- Ensure Python 3.6+ is available for running the script
- Handle cases where log files might be empty or missing

**MCP Server Connection Issues:**
- Verify MCP server configuration in mcp.json
- Check MySQL database connectivity and credentials
- Ensure required MCP tools are available and trusted
- Test connection with simple queries before full extraction

**Schema Extraction Problems:**
- Verify database user has sufficient permissions for schema access
- Check for tables with special characters or reserved names
- Ensure all databases/schemas are accessible
- Handle large schemas with appropriate timeouts