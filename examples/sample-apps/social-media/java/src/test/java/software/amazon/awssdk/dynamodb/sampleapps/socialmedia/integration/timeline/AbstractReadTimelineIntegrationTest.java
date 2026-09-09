package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.timeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.PaginationTokenCodec;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

/**
 *  read-home-timeline integration tests booting the full web application against DynamoDB
 * Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles produce identical ordering, pagination, and HTTP outcomes. A single DynamoDB
 * Local container is shared across the client-type subclasses (singleton pattern) and the streams
 * poller is disabled so it does not race these HTTP-only tests.
 */
abstract class AbstractReadTimelineIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

    private static final String FIRST_POST_TEXT = "first";
    private static final String SECOND_POST_TEXT = "second";
    private static final String THIRD_POST_TEXT = "third";

private static final int DEFAULT_LIMIT_PLUS_ONE = 51;

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
     * Points the application at the shared container, enables resource creation, and disables the
     * streams poller for these HTTP-only tests.
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
    void emptyTimelineReturns200WithEmptyItemsAndNoToken() {
        String reader = createUser();

        ResponseEntity<PageBody> response = readTimeline(reader, "", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().userId()).isEqualTo(reader);
        assertThat(response.getBody().items()).isEmpty();
        assertThat(response.getBody().nextToken()).isNull();
    }

    @Test
    void timelineReturnsNewestFirstByDefault() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        String first = publish(author, FIRST_POST_TEXT);
        String second = publish(author, SECOND_POST_TEXT);
        String third = publish(author, THIRD_POST_TEXT);

        ResponseEntity<PageBody> response = readTimeline(follower, "", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<String> postIds = postIds(response.getBody());
        assertThat(postIds).containsExactly(third, second, first);
    }

    @Test
    void scanIndexForwardTrueReturnsOldestFirst() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        String first = publish(author, FIRST_POST_TEXT);
        String second = publish(author, SECOND_POST_TEXT);
        String third = publish(author, THIRD_POST_TEXT);

        ResponseEntity<PageBody> response = readTimeline(follower, "?scanIndexForward=true", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(postIds(response.getBody())).containsExactly(first, second, third);
    }

    @Test
    void pagesThroughWithNextTokenAndOmitsTokenOnFinalPage() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        String first = publish(author, FIRST_POST_TEXT);
        String second = publish(author, SECOND_POST_TEXT);
        String third = publish(author, THIRD_POST_TEXT);

        ResponseEntity<PageBody> firstPage = readTimeline(follower, "?limit=2", PageBody.class);
        assertThat(firstPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(postIds(firstPage.getBody())).containsExactly(third, second);
        assertThat(firstPage.getBody().nextToken()).isNotBlank();

        String token = firstPage.getBody().nextToken();
        Map<String, AttributeValue> continuationKey = PaginationTokenCodec.decode(token);
        assertThat(continuationKey).containsOnlyKeys(
                "PK", "SK", "timelineUserId", "timelineCreatedAt", "timelinePostId");
        ResponseEntity<PageBody> secondPage = readTimeline(follower,
                "?limit=2&nextToken=" + token, PageBody.class);
        assertThat(secondPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(postIds(secondPage.getBody())).containsExactly(first);
        assertThat(secondPage.getBody().nextToken()).isNull();
    }

    @Test
    void suppliedHighLimitIsForwardedToDynamoDb() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        for (int i = 0; i < 25; i++) {
            publish(author, "post-" + i);
        }

        ResponseEntity<PageBody> response = readTimeline(follower, "?limit=100", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().items()).hasSize(25);
        assertThat(response.getBody().nextToken()).isNull();
    }

    @Test
    void limitContract_defaultsToFiftyAcceptsMaximumAndRejectsOutOfRange() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        for (int index = 0; index < DEFAULT_LIMIT_PLUS_ONE; index++) {
            publish(author, "default-limit-post-" + index);
        }

        ResponseEntity<PageBody> defaultPage = readTimeline(follower, "", PageBody.class);
        assertThat(defaultPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(defaultPage.getBody().items()).hasSize(50);
        assertThat(defaultPage.getBody().nextToken()).isNotBlank();

        ResponseEntity<PageBody> suppliedPage = readTimeline(follower, "?limit=100", PageBody.class);
        assertThat(suppliedPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(suppliedPage.getBody().items()).hasSize(DEFAULT_LIMIT_PLUS_ONE);
        assertThat(suppliedPage.getBody().nextToken()).isNull();

        assertInvalidLimit(follower, "?limit=0");
        assertInvalidLimit(follower, "?limit=-1");
        assertInvalidLimit(follower, "?limit=101");
    }

    @Test
    void malformedUserIdReturns400ValidationError() {
        ResponseEntity<ErrorBody> response = readTimeline("bad id!", "", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void invalidScanIndexForwardReturns400ValidationError() {
        String reader = createUser();

        ResponseEntity<ErrorBody> response = readTimeline(reader, "?scanIndexForward=maybe", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void malformedTokenReturns400InvalidPaginationToken() {
        String reader = createUser();

        ResponseEntity<ErrorBody> response = readTimeline(reader, "?nextToken=not-a-real-token", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_PAGINATION_TOKEN");
    }

    @Test
    void wrongRouteTokenReturns400InvalidPaginationToken() {
        String reader = createUser();
        // A token that lacks the timelinePostId discriminator, as an inbox pagination token would.
        String inboxLikeToken = PaginationTokenCodec.encode(Map.of(
                "PK", AttributeValue.fromS("USER#" + reader),
                "SK", AttributeValue.fromS("INBOX#conv_1"),
                "inboxUserId", AttributeValue.fromS(reader),
                "conversationType", AttributeValue.fromS("DIRECT_MESSAGE")));

        ResponseEntity<ErrorBody> response = readTimeline(reader,
                "?nextToken=" + inboxLikeToken, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_PAGINATION_TOKEN");
    }

    private <T> ResponseEntity<T> readTimeline(String userId, String query, Class<T> responseType) {
        return restTemplate.exchange(url("/api/v1/timeline/" + userId + query),
                HttpMethod.GET, HttpEntity.EMPTY, responseType);
    }

    private String publish(String author, String text) {
        ResponseEntity<PublishBody> response = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, "{\"text\":\"" + text + "\",\"visibility\":\"PUBLIC\"}"),
                PublishBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().postId();
    }

    private List<String> postIds(PageBody body) {
        return body.items().stream().map(TimelineItemBody::postId).toList();
    }

    /** Asserts that an out-of-range query limit is rejected at the HTTP boundary. */
    private void assertInvalidLimit(String userId, String query) {
        ResponseEntity<ErrorBody> response = readTimeline(userId, query, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"), new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                url("/api/v1/users/" + targetUserId + "/follows"),
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private HttpEntity<String> jsonEntity(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return new HttpEntity<>(body, headers);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    /** Minimal view of the timeline page body. */
    record PageBody(String userId, List<TimelineItemBody> items, String nextToken) {
    }

    /** Minimal view of one timeline entry. */
    record TimelineItemBody(String postId, String authorId, String text, String createdAt) {
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
