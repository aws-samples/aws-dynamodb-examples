# 🚀 DynamoDB Local with Docker Setup

This guide will help you get a local version of **DynamoDB** running with **Docker** and show you how to interact with it using the **AWS CLI**. Perfect for testing your app or playing around with AWS DynamoDB without any AWS charges.

## 🛠️ What's in this Setup?

We can use **Docker Compose** to launch two services:

### 1. **DynamoDB Local**
   - **Purpose**: A local version of DynamoDB running inside a Docker container.
   - **Port**: Accessible on your machine at `http://localhost:8000`.
   - **Why**: You can test DynamoDB operations without connecting to the AWS Cloud.

### 2. **AWS CLI (App-Node)**
   - **Purpose**: Runs the AWS CLI inside Docker to interact with DynamoDB Local.
   - **Command**: Runs a sample command to check DynamoDB limits (`describe-limits`).
   - **Environment**: Uses **dummy AWS credentials** (since you're working locally).

---

## 🏃 How to Get Started

1. **Install Docker** 🐳  
   Make sure you’ve got Docker installed on your machine.  
   👉 [Get Docker here](https://www.docker.com/get-started)

2. **Clone or Download this Repo**  
   Copy the `docker-compose.yml` file to your project folder.

3. **Run the services**  
   Open a terminal, navigate to your project folder, and run:
   ```bash
   docker-compose up
   ```
   🟢 This starts DynamoDB on `http://localhost:8000` and runs the AWS CLI command to check DynamoDB’s limits.

4. **Check DynamoDB Tables**  
   In a new terminal, run this command to see the tables in your local DynamoDB:
   ```bash
   aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-west-2
   ```
   You should get an empty list if no tables are created yet.

5. **Stop the services**  
   When you're done, shut everything down with:
   ```bash
   docker-compose down
   ```