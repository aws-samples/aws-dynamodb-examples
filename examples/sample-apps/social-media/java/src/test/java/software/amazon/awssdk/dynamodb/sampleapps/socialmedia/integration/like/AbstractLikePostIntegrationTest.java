package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.like;

import static org.assertj.core.api.Assertions.assertThat;

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

/**
 * Like-post integration tests booting the full web application against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles write an identical like edge, increment the counter identically, and produce
 * identical HTTP outcomes. A single DynamoDB Local container is shared across the client-type
 * subclasses (singleton pattern) and the streams poller is disabled so it does not race these
 * HTTP-only tests. Every test uses freshly generated ids so the two
 * client-type runs never collide in the shared container. Posts are text-only so the flow does not
 * touch the media store.
 */
abstract class AbstractLikePostIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

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
    void firstLikeReturns200WithUpdatedCount() {
        String author = createUser();
        String liker = createUser();
        String postId = publishPublicPost(author);

        ResponseEntity<LikeBody> response = like(liker, postId, LikeBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().postId()).isEqualTo(postId);
        assertThat(response.getBody().userId()).isEqualTo(liker);
        assertThat(response.getBody().likeCount()).isEqualTo(1L);
    }

    @Test
    void duplicateLikeReturns409AlreadyLikedWithNoDoubleIncrement() {
        String author = createUser();
        String liker = createUser();
        String postId = publishPublicPost(author);
        assertThat(like(liker, postId, LikeBody.class).getBody().likeCount()).isEqualTo(1L);

        ResponseEntity<ErrorBody> duplicate = like(liker, postId, ErrorBody.class);

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicate.getBody()).isNotNull();
        assertThat(duplicate.getBody().error()).isEqualTo("ALREADY_LIKED");
    }

    @Test
    void twoDistinctLikersReachCountTwo() {
        String author = createUser();
        String postId = publishPublicPost(author);

        assertThat(like(createUser(), postId, LikeBody.class).getBody().likeCount()).isEqualTo(1L);
        assertThat(like(createUser(), postId, LikeBody.class).getBody().likeCount()).isEqualTo(2L);
    }

    @Test
    void missingActorReturns400ValidationError() {
        String postId = publishPublicPost(createUser());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                likeUrl(postId), HttpMethod.POST, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void malformedPostIdReturns400ValidationError() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, createUser());
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts/bad$id/likes",
                HttpMethod.POST, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void unknownPostReturns404PostNotFound() {
        ResponseEntity<ErrorBody> response = like(createUser(), "post_missing", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    @Test
    void unknownLikerReturns404UserNotFound() {
        String postId = publishPublicPost(createUser());

        ResponseEntity<ErrorBody> response = like(uniqueUserId(), postId, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void privatePostHiddenFromNonAuthorReturns404PostNotFound() {
        String author = createUser();
        String liker = createUser();
        String postId = publishPost(author, "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}");

        ResponseEntity<ErrorBody> response = like(liker, postId, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    @Test
    void authorMayLikeOwnPrivatePost() {
        String author = createUser();
        String postId = publishPost(author, "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}");

        ResponseEntity<LikeBody> response = like(author, postId, LikeBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().likeCount()).isEqualTo(1L);
    }

    @Test
    void restrictedPostAllowsListedViewerAndHidesOthers() {
        String author = createUser();
        String allowed = createUser();
        String outsider = createUser();
        String postId = publishPost(author,
                "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowed + "\"]}");

        assertThat(like(allowed, postId, LikeBody.class).getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<ErrorBody> hidden = like(outsider, postId, ErrorBody.class);
        assertThat(hidden.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(hidden.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    private <T> ResponseEntity<T> like(String actor, String postId, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                likeUrl(postId), HttpMethod.POST, new HttpEntity<>(headers), responseType);
    }

    private String publishPublicPost(String author) {
        return publishPost(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}");
    }

    private String publishPost(String author, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, author);
        ResponseEntity<PublishBody> published = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts",
                HttpMethod.POST, new HttpEntity<>(body, headers), PublishBody.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(published.getBody()).isNotNull();
        return published.getBody().postId();
    }

    private String createUser() {
        String userId = uniqueUserId();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                "http://localhost:" + port + "/api/v1/users", new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private String likeUrl(String postId) {
        return "http://localhost:" + port + "/api/v1/posts/" + postId + "/likes";
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the like success body. */
    record LikeBody(String postId, String userId, long likeCount) {
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
