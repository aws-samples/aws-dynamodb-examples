package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.inbox;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
 * List-inbox integration tests booting the full web application against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles produce identical ordering, filtering, pagination, and HTTP outcomes. A single
 * DynamoDB Local container is shared across the client-type subclasses (singleton pattern) and the
 * streams poller is disabled so it does not race these HTTP-only tests. Every test uses freshly generated ids so the two client-type runs never collide in the
 * shared container.
 */
abstract class AbstractListInboxIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

    private static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    private static final String INVALID_PAGINATION_TOKEN = "INVALID_PAGINATION_TOKEN";

private static final int DEFAULT_LIMIT_PLUS_ONE = 51;

private static final long DISTINCT_SECOND_MILLIS = 1_100L;

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
    void emptyInboxReturns200WithEmptyItemsAndNoToken() {
        String owner = createUser();

        ResponseEntity<PageBody> response = listInbox(owner, "", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().userId()).isEqualTo(owner);
        assertThat(response.getBody().items()).isEmpty();
        assertThat(response.getBody().nextToken()).isNull();
    }

    @Test
    void startupSeededInboxProjectionsAppearBeforeAnyMessageIsSent() {
        assertSeededInbox("user_alice", true);
        assertSeededInbox("user_bob", true);
        assertSeededInbox("user_carol", false);
    }

    @Test
    void inboxReturnsMostRecentActivityFirstAcrossTypes() {
        String owner = createUser();
        String partner = createUser();
        String other = createUser();

        // Direct conversation, then a group, then a message that lifts the group to the top.
        String direct = createDirectMessage(owner, partner);
        sendMessage(owner, direct, "first direct");
        settle();
        String group = createGroup(owner, "Study group", owner, partner, other);
        sendMessage(owner, group, "see you at three");

        ResponseEntity<PageBody> response = listInbox(owner, "", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<String> ids = conversationIds(response.getBody());
        assertThat(ids).containsExactly(group, direct);
        assertThat(response.getBody().items().get(0).type()).isEqualTo("GROUP");
        assertThat(response.getBody().items().get(0).title()).isEqualTo("Study group");
        assertThat(response.getBody().items().get(1).type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(response.getBody().items().get(1).title()).isNull();
    }

    @Test
    void typeFilterReturnsOnlyThatConversationType() {
        String owner = createUser();
        String partner = createUser();
        String other = createUser();
        String direct = createDirectMessage(owner, partner);
        String group = createGroup(owner, "Trip", owner, partner, other);

        ResponseEntity<PageBody> groups = listInbox(owner, "?type=GROUP", PageBody.class);
        assertThat(groups.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(groups.getBody())).containsExactly(group);

        ResponseEntity<PageBody> directs = listInbox(owner, "?type=DIRECT_MESSAGE", PageBody.class);
        assertThat(directs.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(directs.getBody())).containsExactly(direct);
    }

    @Test
    void scanIndexForwardTrueReturnsOldestFirst() {
        String owner = createUser();
        String partner = createUser();
        String older = createDirectMessage(owner, partner);
        sendMessage(owner, older, "older");
        settle();
        String other = createUser();
        String newer = createGroup(owner, "Newer", owner, partner, other);
        sendMessage(owner, newer, "newer");

        ResponseEntity<PageBody> response = listInbox(owner, "?scanIndexForward=true", PageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(response.getBody())).containsExactly(older, newer);
    }

    @Test
    void filteredModePagesThroughWithNextTokenAndOmitsTokenOnFinalPage() {
        String owner = createUser();
        String p1 = createUser();
        String p2 = createUser();
        String first = createGroup(owner, "G1", owner, p1, p2);
        sendMessage(owner, first, "g1");
        settle();
        String second = createGroup(owner, "G2", owner, p1, p2);
        sendMessage(owner, second, "g2");
        settle();
        String third = createGroup(owner, "G3", owner, p1, p2);
        sendMessage(owner, third, "g3");

        ResponseEntity<PageBody> firstPage = listInbox(owner, "?type=GROUP&limit=2", PageBody.class);
        assertThat(firstPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(firstPage.getBody())).containsExactly(third, second);
        assertThat(firstPage.getBody().nextToken()).isNotBlank();
        Map<String, AttributeValue> continuationKey = PaginationTokenCodec.decode(firstPage.getBody().nextToken());
        assertThat(continuationKey).containsOnlyKeys(
                "PK", "SK", "inboxUserId", "conversationType", "lastActivityAt");

        ResponseEntity<PageBody> secondPage = listInbox(owner,
                "?type=GROUP&limit=2&nextToken=" + firstPage.getBody().nextToken(), PageBody.class);
        assertThat(secondPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(secondPage.getBody())).containsExactly(first);
        assertThat(secondPage.getBody().nextToken()).isNull();
    }

    @Test
    void limitContract_defaultsToFiftyAcceptsMaximumAndRejectsOutOfRange() {
        String owner = createUser();
        String memberOne = createUser();
        String memberTwo = createUser();
        for (int index = 0; index < DEFAULT_LIMIT_PLUS_ONE; index++) {
            createGroup(owner, "Group " + index, owner, memberOne, memberTwo);
        }

        ResponseEntity<PageBody> defaultPage = listInbox(owner, "?type=GROUP", PageBody.class);
        assertThat(defaultPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(defaultPage.getBody().items()).hasSize(50);
        assertThat(defaultPage.getBody().nextToken()).isNotBlank();

        ResponseEntity<PageBody> suppliedPage = listInbox(owner, "?type=GROUP&limit=100", PageBody.class);
        assertThat(suppliedPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(suppliedPage.getBody().items()).hasSize(DEFAULT_LIMIT_PLUS_ONE);
        assertThat(suppliedPage.getBody().nextToken()).isNull();

        assertInvalidLimit(owner, "?limit=0");
        assertInvalidLimit(owner, "?limit=-1");
        assertInvalidLimit(owner, "?limit=101");
    }

    @Test
    void mergedModePagesThroughWithBundledTokenWithoutDuplicates() {
        String owner = createUser();
        String partner = createUser();
        String g1 = createUser();
        String g2 = createUser();

        // Two direct conversations and two groups, activity ordered by send with distinct seconds.
        String directA = createDirectMessage(owner, partner);
        sendMessage(owner, directA, "dA");
        settle();
        String groupA = createGroup(owner, "GA", owner, g1, g2);
        sendMessage(owner, groupA, "gA");
        settle();
        String directB = createDirectMessage(owner, g1);
        sendMessage(owner, directB, "dB");
        settle();
        String groupB = createGroup(owner, "GB", owner, partner, g2);
        sendMessage(owner, groupB, "gB");

        ResponseEntity<PageBody> firstPage = listInbox(owner, "?limit=2", PageBody.class);
        assertThat(firstPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(firstPage.getBody().items()).hasSize(2);
        assertThat(firstPage.getBody().nextToken()).isNotBlank();
        Map<String, AttributeValue> token = PaginationTokenCodec.decode(firstPage.getBody().nextToken());
        assertThat(token).containsKeys("inboxMerged", "directState", "groupState");
        assertThat(token.get("directState").s()).isEqualTo("AFTER_KEY");
        assertThat(token.get("groupState").s()).isEqualTo("AFTER_KEY");
        assertThat(token.keySet()).filteredOn(key -> key.startsWith("d#") || key.startsWith("g#"))
                .hasSize(10);

        ResponseEntity<PageBody> secondPage = listInbox(owner,
                "?limit=2&nextToken=" + firstPage.getBody().nextToken(), PageBody.class);
        assertThat(secondPage.getStatusCode()).isEqualTo(HttpStatus.OK);

        List<String> all = new ArrayList<>(conversationIds(firstPage.getBody()));
        all.addAll(conversationIds(secondPage.getBody()));
        // Every conversation appears exactly once across the two pages, newest activity first.
        assertThat(all).containsExactly(groupB, directB, groupA, directA);
    }

    @Test
    void mergedMode_withOneDirectAndManyGroups_returnsAtLeastThreeStablePagesWithoutDuplicates() {
        String owner = createUser();
        String memberOne = createUser();
        String memberTwo = createUser();
        String direct = createDirectMessage(owner, memberOne);
        sendMessage(owner, direct, "direct");
        settle();

        List<String> groups = new ArrayList<>();
        for (int index = 1; index <= 5; index++) {
            String group = createGroup(owner, "Group " + index, owner, memberOne, memberTwo);
            sendMessage(owner, group, "group " + index);
            groups.add(group);
            if (index < 5) {
                settle();
            }
        }

        List<String> all = readMergedConversationIdsAcrossPages(owner, 2);

        assertThat(all).containsExactly(groups.get(4), groups.get(3), groups.get(2), groups.get(1), groups.get(0),
                direct);
    }

    @Test
    void mergedMode_withManyDirectsAndOneGroup_returnsAtLeastThreeStablePagesWithoutDuplicates() {
        String owner = createUser();
        List<String> partners = List.of(createUser(), createUser(), createUser(), createUser(), createUser());
        List<String> directs = new ArrayList<>();
        for (int index = 0; index < partners.size(); index++) {
            String direct = createDirectMessage(owner, partners.get(index));
            sendMessage(owner, direct, "direct " + index);
            directs.add(direct);
            settle();
        }
        String group = createGroup(owner, "One group", owner, partners.get(0), partners.get(1));
        sendMessage(owner, group, "group");

        List<String> all = readMergedConversationIdsAcrossPages(owner, 2);

        assertThat(all).containsExactly(group, directs.get(4), directs.get(3), directs.get(2), directs.get(1),
                directs.get(0));
    }

    @Test
    void unknownUserReturns404UserNotFound() {
        String ghost = uniqueUserId();

        ResponseEntity<ErrorBody> response = listInbox(ghost, "", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void malformedUserIdReturns400ValidationError() {
        ResponseEntity<ErrorBody> response = listInbox("bad id!", "", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(VALIDATION_ERROR);
    }

    @Test
    void invalidTypeReturns400ValidationError() {
        String owner = createUser();

        ResponseEntity<ErrorBody> response = listInbox(owner, "?type=CHANNEL", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(VALIDATION_ERROR);
    }

    @Test
    void invalidScanIndexForwardReturns400ValidationError() {
        String owner = createUser();

        ResponseEntity<ErrorBody> response = listInbox(owner, "?scanIndexForward=maybe", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(VALIDATION_ERROR);
    }

    @Test
    void malformedTokenReturns400InvalidPaginationToken() {
        String owner = createUser();

        ResponseEntity<ErrorBody> response = listInbox(owner,
                "?type=GROUP&nextToken=not-a-real-token", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(INVALID_PAGINATION_TOKEN);
    }

    @Test
    void wrongRouteTokenReturns400InvalidPaginationToken() {
        String owner = createUser();
        // A token that lacks the conversationType discriminator, as a timeline pagination token would.
        String timelineLikeToken = PaginationTokenCodec.encode(Map.of(
                "PK", AttributeValue.fromS("USER#" + owner),
                "SK", AttributeValue.fromS("TIMELINE#2026#post_1"),
                "timelineUserId", AttributeValue.fromS(owner),
                "timelinePostId", AttributeValue.fromS("post_1")));

        ResponseEntity<ErrorBody> filtered = listInbox(owner,
                "?type=GROUP&nextToken=" + timelineLikeToken, ErrorBody.class);
        assertThat(filtered.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(filtered.getBody().error()).isEqualTo(INVALID_PAGINATION_TOKEN);

        ResponseEntity<ErrorBody> merged = listInbox(owner,
                "?nextToken=" + timelineLikeToken, ErrorBody.class);
        assertThat(merged.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(merged.getBody().error()).isEqualTo(INVALID_PAGINATION_TOKEN);
    }

    @Test
    void mergedTokenRejectedOnFilteredRoute() {
        String owner = createUser();
        String p1 = createUser();
        String p2 = createUser();
        String g1 = createGroup(owner, "G1", owner, p1, p2);
        sendMessage(owner, g1, "g1");
        String g2 = createGroup(owner, "G2", owner, p1, p2);
        sendMessage(owner, g2, "g2");

        ResponseEntity<PageBody> mergedFirst = listInbox(owner, "?limit=1", PageBody.class);
        assertThat(mergedFirst.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mergedFirst.getBody().nextToken()).isNotBlank();

        // Reusing a merged (bundled) token on the filtered route is rejected.
        ResponseEntity<ErrorBody> response = listInbox(owner,
                "?type=GROUP&nextToken=" + mergedFirst.getBody().nextToken(), ErrorBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(INVALID_PAGINATION_TOKEN);
    }

    private <T> ResponseEntity<T> listInbox(String userId, String query, Class<T> responseType) {
        return restTemplate.exchange(url("/api/v1/inbox/" + userId + query),
                HttpMethod.GET, HttpEntity.EMPTY, responseType);
    }

    private String createDirectMessage(String creator, String other) {
        return createConversation(creator,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(creator, other) + "}");
    }

    private String createGroup(String creator, String title, String... members) {
        return createConversation(creator,
                "{\"type\":\"GROUP\",\"title\":\"" + title + "\",\"participantUserIds\":"
                        + jsonArray(members) + "}");
    }

    private String createConversation(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<ConversationBody> response = restTemplate.exchange(
                url("/api/v1/conversations"), HttpMethod.POST, new HttpEntity<>(body, headers),
                ConversationBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().conversationId();
    }

    private void sendMessage(String actor, String conversationId, String text) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> response = restTemplate.exchange(
                url("/api/v1/conversations/" + conversationId + "/messages"),
                HttpMethod.POST, new HttpEntity<>("{\"text\":\"" + text + "\"}", headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private List<String> conversationIds(PageBody body) {
        return body.items().stream().map(InboxItemBody::conversationId).toList();
    }

    /** Reads all merged pages and asserts the asymmetric cases span at least three pages. */
    private List<String> readMergedConversationIdsAcrossPages(String userId, int limit) {
        List<String> conversationIds = new ArrayList<>();
        String nextToken = null;
        int pageCount = 0;
        do {
            String query = "?limit=" + limit + (nextToken == null ? "" : "&nextToken=" + nextToken);
            ResponseEntity<PageBody> response = listInbox(userId, query, PageBody.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            conversationIds.addAll(conversationIds(response.getBody()));
            nextToken = response.getBody().nextToken();
            pageCount++;
        } while (nextToken != null);
        assertThat(pageCount).isGreaterThanOrEqualTo(3);
        assertThat(conversationIds).doesNotHaveDuplicates();
        return conversationIds;
    }

    /** Asserts the startup-seeded direct and group projections visible to one seeded participant. */
    private void assertSeededInbox(String userId, boolean participatesInDirectMessage) {
        ResponseEntity<PageBody> direct = listInbox(userId, "?type=DIRECT_MESSAGE", PageBody.class);
        assertThat(direct.getStatusCode()).isEqualTo(HttpStatus.OK);
        if (participatesInDirectMessage) {
            assertThat(conversationIds(direct.getBody())).containsExactly("conv_alice_bob");
        } else {
            assertThat(direct.getBody().items()).isEmpty();
        }

        ResponseEntity<PageBody> group = listInbox(userId, "?type=GROUP", PageBody.class);
        assertThat(group.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(conversationIds(group.getBody())).containsExactly("conv_study_group");
        assertThat(group.getBody().items().get(0).title()).isEqualTo("Study group");
        assertThat(group.getBody().items().get(0).lastMessagePreview()).isEqualTo("No messages yet");

        ResponseEntity<PageBody> merged = listInbox(userId, "", PageBody.class);
        assertThat(merged.getStatusCode()).isEqualTo(HttpStatus.OK);
        if (participatesInDirectMessage) {
            assertThat(conversationIds(merged.getBody()))
                    .containsExactly("conv_study_group", "conv_alice_bob");
        } else {
            assertThat(conversationIds(merged.getBody())).containsExactly("conv_study_group");
        }
    }

    /** Asserts that an out-of-range query limit is rejected at the HTTP boundary. */
    private void assertInvalidLimit(String userId, String query) {
        ResponseEntity<ErrorBody> response = listInbox(userId, query, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo(VALIDATION_ERROR);
    }

    private String createUser() {
        String userId = uniqueUserId();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"), new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Pauses so the next inbox activity lands in a distinct whole second (see {@link #DISTINCT_SECOND_MILLIS}). */
    private static void settle() {
        try {
            Thread.sleep(DISTINCT_SECOND_MILLIS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while spacing inbox activity", e);
        }
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    /** Minimal view of the inbox page body. */
    record PageBody(String userId, List<InboxItemBody> items, String nextToken) {
    }

    /** Minimal view of one inbox entry. */
    record InboxItemBody(String conversationId, String type, String title, String lastMessagePreview,
                         String lastActivityAt) {
    }

    /** Minimal view of the conversation-create success body. */
    record ConversationBody(String conversationId, String type, String title, long participantCount,
                            String createdAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
