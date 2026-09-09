package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.util.List;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Contributes API metadata merged into the OpenAPI document served by springdoc-openapi at
 * {@code /api-docs}.
 *
 * <p>The raw OpenAPI JSON is served at {@code /api-docs} and the interactive UI at
 * {@code /swagger-ui.html}. Both are removed under the production profile.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Builds the OpenAPI description for the Social Media API.
     *
     * @return the OpenAPI model served at {@code /api-docs} and rendered in Swagger UI
     */
    @Bean
    public OpenAPI socialMediaOpenAPI() {
        return new OpenAPI()
                .servers(List.of(new Server()
                        .url("http://localhost:8080")))
                .info(new Info()
                        .title("Social Media DynamoDB Sample API")
                        .description("Sample application demonstrating DynamoDB patterns for a social media workload "
                                + "using AWS SDK for Java v2. Covers profiles, a follow graph, posts with timeline "
                                + "fan-out, likes, ephemeral stories, direct message and group conversations, inbox "
                                + "ordering, and stream-driven notifications.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("AWS SDK for Java Team")));
    }
}
