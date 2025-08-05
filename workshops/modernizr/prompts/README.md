# Welcome to the prompts! 




## Requirements Document 
Simply put they are the WHAT needs to be built and WHY. 
- Defines the business goals and user needs
- Specifies acceptance criteria ("the definition of done")
- Provides context about the problem being solved
- Gives Q the constraints and success criteria to validate against

## Design document 
HOW it will be built
- Defines the technical approach and architecture
- Specifies the exact methods, structures, and workflows
- Provides implementation details and decision rationale
- Gives Q the step-by-step methodology to follow

Without requirements, Q might built something technically correct but miss the business goals. Without design Q might understand the goals but not know the proven methodology to achieve them. 

## Tasks Document 
WHAT TO DO NEXT in executable steps
- Breaks down the design into specific, actionable coding tasks
- Provides the exact sequence Q should follow
- References specific files, prompts, and outputs
- Gives Q concrete next actions rather than abstract concepts
- Here's why Q specifically needs the tasks file:

Without Tasks File:

Q reads the design and thinks "This is complex, where do I start?"
Q might try to implement everything at once and get overwhelmed
Q doesn't know which prompt file to use for each step
Q doesn't know the dependencies between steps

With Tasks File:

Q sees "Start with task 2.1: Connect to MySQL database via MCP server"
Q knows exactly which tools to use (ddb_migrate___connect_database)
Q knows what output to produce (Stage1_MySQLAnalysis.md)
Q knows which requirement this satisfies (1.1)
Real Example: Instead of Q reading "implement DynamoDB data access layer" (vague), Q gets:

- [ ] 5.2 Implement core DynamoDB operations incrementally
  - Implement basic DynamoDB DAL structure following Stage3_DataModel.md
  - **CRITICAL**: Run tests before ANY changes and after EVERY change
  - **REFERENCE**: Use migrationContract.json structure from task 2.4
The tasks file essentially converts your complex prompts into a step-by-step execution plan that Q can follow without getting lost in the complexity.

Think of it like this:

Requirements = The destination (where we want to go)
Design = The map (how to get there)
Tasks = The GPS directions (turn-by-turn instructions)