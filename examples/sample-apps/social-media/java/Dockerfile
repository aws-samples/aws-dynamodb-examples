# Stage 1: Build
# Base image pinned to a specific Temurin patch (21.0.11+10) plus its manifest
# digest so the build is reproducible and not silently moved by a floating tag.
FROM eclipse-temurin:21.0.11_10-jdk@sha256:b9142586f9712700c6c9e07adcedfb18608b1a3a056e4001423a3354adfa9d80 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apt-get update && apt-get install -y maven && \
    mvn clean package -DskipTests -q

# Stage 2: Runtime
# Same pinning rationale as the build stage, pinned to the patch tag and digest.
FROM eclipse-temurin:21.0.11_10-jre@sha256:010e0a06bd4e0184dec58626afb3ba727b42c56c91b977e2f0a9e0837e0fa3fb
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Run as a dedicated non-root user (uid/gid 10001) instead of root so a
# compromise of the app process has a smaller blast radius. The jar is owned by
# the app user and no privileged operations are needed at runtime.
RUN groupadd --gid 10001 app && \
    useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app && \
    chown -R app:app /app
USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
