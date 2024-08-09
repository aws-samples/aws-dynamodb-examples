# Various Examples and AWS SDK code examples for Amazon DynamoDB

An Amazon Web Services and DynamoDB community-led repository containing code and examples for developing with and using [Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.html).

We have [IAM policies for DynamoDB](https://github.com/aws-samples/aws-dynamodb-examples/tree/master/DynamoDBIAMPolicies), [a script to load an existing table](https://github.com/aws-samples/aws-dynamodb-examples/tree/master/nosqlworkbenchscript) into NoSQL Workbench, [CloudFormation examples](https://github.com/aws-samples/aws-dynamodb-examples/tree/master/cloudformation), and [a CDK to track table size and item count histories to CloudWatch](https://github.com/aws-samples/aws-dynamodb-examples/tree/master/DynamoDBCustomMetrics). 

We also have AWS SDK [code examples for DynamoDB in various languages](https://github.com/aws-samples/aws-dynamodb-examples/tree/master/DynamoDB-SDK-Examples). You can find each language examples here:

* [Node.js](./DynamoDB-SDK-Examples/node.js)
* [Java](./DynamoDB-SDK-Examples/java)
* [Python](./DynamoDB-SDK-Examples/python)
* [.Net](./DynamoDB-SDK-Examples/dotnet)
* [Golang](./DynamoDB-SDK-Examples/golang)
* [Rust](./DynamoDB-SDK-Examples/rust)
* [Ruby](./DynamoDB-SDK-Examples/ruby)

---
## DynamoDB Examples with Amazon Bedrock
This repository provides comprehensive examples of how to integrate Amazon Bedrock's powerful large language models (LLMs) with AWS DynamoDB for building scalable, context-aware chatbots and AI applications. These examples demonstrate how to leverage DynamoDB's NoSQL database capabilities to persist conversation history and user interactions, ensuring continuity in AI-driven conversations across sessions.

Key highlights include:

- Bedrock Integration: Seamlessly connect to Amazon Bedrock to harness the power of cutting-edge LLMs from providers like Anthropic, AI21 Labs, and more.
- DynamoDB for Context Management: Utilize DynamoDB to store and retrieve chat history, enabling AI models to maintain context and deliver more coherent and relevant responses over time.
- Scalable and Serverless Architecture: Build applications that are both scalable and cost-effective, with DynamoDB handling large-scale data storage and Bedrock providing robust AI capabilities without the need to manage underlying infrastructure.
- Real-world Applications: Explore practical examples, including setting up the environment, creating DynamoDB tables, integrating with Bedrock, and building a fully functional web-based chatbot using Streamlit.

These examples are designed to help developers, data scientists, and AI enthusiasts quickly get started with building sophisticated AI applications on AWS, using best practices for cloud-native development.

[Integration with LangChain Message History and Bedrock](../aws-dynamodb-examples/Bedrock-Examples/Langchain/)

---

PS. If you are up for contributing, we welcome community pull requests.


All code in this repository is provided as is, where is. There are no guarantees, either expressed or implied. It is up to you to check what they do and utilize the code responsibly.

Special thanks to other contributors to this repo before it was moved over to this current location. Here are their GitHub users:
* @jprivillaso
* @tywalch
* @normj
* @jasonwadsworth
* @johanrin
* @DejanBelic
* @TLaue
