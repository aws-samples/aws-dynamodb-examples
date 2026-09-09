package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.readiness;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

/**
 *  service-readiness integration tests booting the full web application against DynamoDB
 * Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles are verified end-to-end. A single DynamoDB Local container is shared across the
 * client-type subclasses (singleton pattern) and the streams poller is disabled so it does not race
 * these HTTP-only tests.
 */
abstract class AbstractServiceReadinessIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

static final GenericContainer<?> DYNAMODB =
            new GenericContainer<>(DockerImageName.parse("amazon/dynamodb-local:latest"))
                    .withExposedPorts(DYNAMODB_PORT);

    static {
        DYNAMODB.start();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    /**
     * Points the application at the shared DynamoDB Local container, enables resource creation, and
     * disables the streams poller for these HTTP-only tests.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
    }

    @Test
    void healthReturnsOkWithTopLevelStatusOnly() {
        ResponseEntity<String> response =
                restTemplate.getForEntity(url("/actuator/health"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
        // Hardened surface: status only, no per-component, dependency, or introspection detail.
        assertThat(response.getBody())
                .doesNotContain("components")
                .doesNotContain("diskSpace")
                .doesNotContain("details");
    }

    @Test
    void apiDocsReturnsValidOpenApiJsonWhenEnabled() {
        ResponseEntity<String> response =
                restTemplate.getForEntity(url("/api-docs"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isNotNull();
        assertThat(response.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_JSON)).isTrue();
        assertThat(response.getBody())
                .contains("\"openapi\"")
                .contains("\"info\"")
                .contains("\"title\"");
    }

    @Test
    void apiDocs_whenEnabled_advertisesLimitMinimumOneAndMaximumOneHundred() throws JsonProcessingException {
        ResponseEntity<String> response =
                restTemplate.getForEntity(url("/api-docs"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode openApi = new ObjectMapper().readTree(response.getBody());
        assertLimitBounds(openApi, "/api/v1/timeline/{userId}");
        assertLimitBounds(openApi, "/api/v1/inbox/{userId}");
    }

    @Test
    void apiDocs_whenEnabled_advertisesDocumentedResponseCodes() throws JsonProcessingException {
        ResponseEntity<String> response =
                restTemplate.getForEntity(url("/api-docs"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode openApi = new ObjectMapper().readTree(response.getBody());
        assertResponseCodes(openApi, "/api/v1/users", "post", "200", "201", "400", "500", "503");
        assertResponseCodes(openApi, "/api/v1/users/{targetUserId}/follows", "post",
                "200", "400", "404", "409", "500", "503");
        assertResponseCodes(openApi, "/api/v1/media", "post", "200", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/posts", "post", "201", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/posts/{postId}/likes", "post",
                "200", "400", "404", "409", "500", "503");
        assertResponseCodes(openApi, "/api/v1/posts/{postId}/context", "get",
                "200", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/timeline/{userId}", "get", "200", "400", "500", "503");
        assertResponseCodes(openApi, "/api/v1/conversations", "post", "201", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/conversations/{conversationId}/messages", "post",
                "201", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/conversations/{conversationId}", "get",
                "200", "400", "404", "500", "503");
        assertResponseCodes(openApi, "/api/v1/inbox/{userId}", "get", "200", "400", "404", "500", "503");
    }

    /**
     * Asserts that the GET {@code limit} query parameter on {@code path} advertises minimum 1,
     * maximum 100, and default 50.
     *
     * @param openApi generated OpenAPI document
     * @param path    OpenAPI path key
     */
    private void assertLimitBounds(JsonNode openApi, String path) {
        JsonNode limitSchema = queryParameterSchema(openApi, path, "limit");
        assertThat(limitSchema.path("minimum").asInt()).isEqualTo(1);
        assertThat(limitSchema.path("maximum").asInt()).isEqualTo(100);
        assertThat(limitSchema.path("default").asInt()).isEqualTo(50);
    }

    /**
     * Asserts that the named operation advertises every expected HTTP response code.
     *
     * @param openApi generated OpenAPI document
     * @param path    OpenAPI path key
     * @param method  HTTP method in lowercase
     * @param codes   response codes that must be present
     */
    private void assertResponseCodes(JsonNode openApi, String path, String method, String... codes) {
        JsonNode responses = openApi.path("paths").path(path).path(method).path("responses");
        assertThat(responses.isObject())
                .as("Missing OpenAPI operation %s %s", method, path)
                .isTrue();
        for (String code : codes) {
            assertThat(responses.has(code))
                    .as("Missing response %s on %s %s", code, method, path)
                    .isTrue();
        }
    }

    /**
     * Returns the schema node for a named query parameter on a GET operation.
     *
     * @param openApi generated OpenAPI document
     * @param path    OpenAPI path key
     * @param name    query parameter name
     * @return the parameter schema node
     */
    private JsonNode queryParameterSchema(JsonNode openApi, String path, String name) {
        JsonNode parameters = openApi.path("paths").path(path).path("get").path("parameters");
        assertThat(parameters.isArray()).isTrue();
        for (JsonNode parameter : parameters) {
            if (name.equals(parameter.path("name").asText())) {
                JsonNode schema = parameter.path("schema");
                assertThat(schema.isMissingNode()).isFalse();
                return schema;
            }
        }
        throw new AssertionError("Missing query parameter " + name + " on " + path);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
