# Use an official Java base image
FROM openjdk:11

# Set the working directory
WORKDIR /app

# Copy your pom.xml and LoadMaxValues.java file into the container
COPY pom.xml .
COPY src/ ./src/

# Install Maven
RUN apt-get update && \
    apt-get install -y maven

# Build the Java application
RUN mvn clean install

# Set the entry point for the container
ENTRYPOINT ["sh", "-c", "java -jar target/LoadMaxValues-1.0-SNAPSHOT.jar"]
