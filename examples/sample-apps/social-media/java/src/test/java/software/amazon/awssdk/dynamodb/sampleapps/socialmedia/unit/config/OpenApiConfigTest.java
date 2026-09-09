package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.OpenApiConfig;

/**
 * Unit coverage for the operation 0 API-docs metadata contract.
 *
 * <p>Verifies the {@code info} block (title, description, version, contact) and a server URL are
 * present so the emitted OpenAPI document is equivalent across implementations. No Docker or Spring
 * context is required.
 */
@Tag("unit")
class OpenApiConfigTest {

    @Test
    void openApiCarriesFixedInfoBlockAndServer() {
        OpenAPI openApi = new OpenApiConfig().socialMediaOpenAPI();

        assertThat(openApi.getInfo()).isNotNull();
        assertThat(openApi.getInfo().getTitle()).isNotBlank();
        assertThat(openApi.getInfo().getDescription()).isNotBlank();
        assertThat(openApi.getInfo().getVersion()).isNotBlank();
        assertThat(openApi.getInfo().getContact()).isNotNull();
        assertThat(openApi.getInfo().getContact().getName()).isNotBlank();
    }

    @Test
    void openApiDeclaresServerUrl() {
        OpenAPI openApi = new OpenApiConfig().socialMediaOpenAPI();

        assertThat(openApi.getServers()).isNotEmpty();
        assertThat(openApi.getServers().get(0).getUrl()).isNotBlank();
    }
}
