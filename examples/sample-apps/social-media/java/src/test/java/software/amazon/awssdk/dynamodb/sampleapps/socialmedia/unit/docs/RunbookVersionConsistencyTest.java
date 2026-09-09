package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.docs;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * Documentation version-consistency check.
 *
 * <p>Asserts that the dependency versions stated in the module runbook match the build manifest
 * ({@code pom.xml}) so the runbook cannot drift from the actual runtime, framework, SDK, and testing
 * versions. Also asserts that the Java README states the pinned AWS SDK for Java v2 version used by
 * the multi-attribute GSI key schema. Runs at the unit tier with no Docker.
 */
@Tag("unit")
class RunbookVersionConsistencyTest {

    private static final Path POM = Path.of("pom.xml");
    private static final Path RUNBOOK = Path.of("docs", "Runbook.md");
    private static final Path JAVA_README = Path.of("README.md");

    @Test
    void runbookVersionsMatchPom() throws IOException {
        String pom = Files.readString(POM);
        String runbook = Files.readString(RUNBOOK);

        Map<String, String> versions = new LinkedHashMap<>();
        versions.put("Java", firstGroup(pom, "<java\\.version>([^<]+)</java\\.version>"));
        versions.put("Spring Boot", firstGroup(pom,
                "<artifactId>spring-boot-starter-parent</artifactId>\\s*<version>([^<]+)</version>"));
        versions.put("AWS SDK for Java v2",
                firstGroup(pom, "<aws-sdk-v2\\.version>([^<]+)</aws-sdk-v2\\.version>"));
        versions.put("springdoc-openapi",
                firstGroup(pom, "<springdoc-openapi\\.version>([^<]+)</springdoc-openapi\\.version>"));
        versions.put("Testcontainers",
                firstGroup(pom, "<testcontainers\\.version>([^<]+)</testcontainers\\.version>"));

        for (Map.Entry<String, String> entry : versions.entrySet()) {
            assertThat(entry.getValue())
                    .as("version for %s parsed from pom.xml", entry.getKey())
                    .isNotBlank();
            assertThat(runbook)
                    .as("module runbook must state the %s version %s from pom.xml",
                            entry.getKey(), entry.getValue())
                    .contains(entry.getValue());
        }
    }

    @Test
    void javaReadme_whenAwsSdkVersionIsPinned_matchesPom() throws IOException {
        String pom = Files.readString(POM);
        String readme = Files.readString(JAVA_README);
        String sdkVersion = firstGroup(pom, "<aws-sdk-v2\\.version>([^<]+)</aws-sdk-v2\\.version>");
        assertThat(sdkVersion)
                .as("AWS SDK for Java v2 version parsed from pom.xml")
                .isNotBlank();
        assertThat(readme)
                .as("java README must state the AWS SDK for Java v2 version %s from pom.xml", sdkVersion)
                .contains(sdkVersion);
    }

    private static String firstGroup(String source, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(source);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "";
    }
}
