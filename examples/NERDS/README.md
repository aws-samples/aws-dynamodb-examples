# 🔥 NERDS - NodeJS Express React DynamoDB and SAM 🔥

Welcome to the NERDS stack - a sizzling hot combination of DynamoDB, React, Express, SAM, and Node.js. This setup will help you bootstrap your application development by connecting it to a DynamoDB table, which provides virtually unlimited scale and low latency with the benefits of a managed service.

## 🚀 Benefits of the NERDS Stack

The NERDS stack offers a powerful set of tools and technologies that work together seamlessly to build scalable and robust web applications:

**DynamoDB:** As the backbone of the stack, DynamoDB provides a highly scalable and fully managed NoSQL database service. With its flexible data model, fast performance, and automatic scaling, DynamoDB is an ideal choice for modern, data-intensive applications.

**React:** The React frontend framework enables the creation of dynamic, responsive, and user-friendly user interfaces. React's component-based architecture and virtual DOM make it efficient for building complex, single-page applications.

**Express:** The Express.js web application framework for Node.js simplifies the development of the backend API. It provides a robust set of features for routing, middleware, and handling HTTP requests and responses. This will be used for the very simple and early projects, as we will be redirecting our focus to SAM

**AWS SAM:** The Serverless Application Model (SAM) allows you to define your serverless application resources, including the DynamoDB table and Lambda functions, in a simple and declarative way. This makes it easier to deploy your application to AWS and manage its infrastructure.

**Node.js:** The Node.js runtime powers the backend of the application, enabling the use of JavaScript for both client-side and server-side logic. Node.js is known for its event-driven, non-blocking I/O model, making it well-suited for building scalable network applications.

By combining these powerful technologies, the DRESN stack provides a comprehensive and cohesive solution for building modern, scalable, and cloud-native web applications. The stack leverages the strengths of each component to create a robust and efficient development environment.

## 🛠️ Getting Started

To get started with the NERDS stack, navigate to the folders with the stack at different stages.

### 🎨 Basic Template

The [basic template](./basic-template/README.md) folder contains a basic template, which is a simple React-based application that will help you get started with working with DynamoDB. All the resources used in this lab are executed locally, so please make sure you have downloaded all the prerequisites before trying to run the sample applications.

### 🎨 Enhanced Template

The [enhanced template](./enhanced-template/README.md) folder contains an enhanced version of the basic template, which is a simple React-based application that will help you get started with working with DynamoDB. The table in this example uses a combination of Partition Key and a Sort Key that allows us to run more elegant queries in the backend and avoid to fetch unecessary data, this example showcase the use of [Query Operations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html).

All the resources used in this lab are executed locally, so please make sure you have downloaded all the prerequisites before trying to run the sample applications.
