package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextItems;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextTransaction;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.ItemResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsResponse;

/**
 * Unit coverage for the atomic Content and UserGraph read that builds and maps post context.
 */
@Tag("unit")
class PostContextTransactionTest {

    private static final TableSchema<PostMeta> POST_META_SCHEMA = TableSchema.fromBean(PostMeta.class);
    private static final TableSchema<UserProfile> PROFILE_SCHEMA = TableSchema.fromBean(UserProfile.class);
    private static final TableSchema<Like> LIKE_SCHEMA = TableSchema.fromBean(Like.class);
    private static final TableSchema<FollowingEdge> FOLLOWING_SCHEMA = TableSchema.fromBean(FollowingEdge.class);

    @Test
    void build_readsPostViewerAndAuthorStateInOneTransaction() {
        TransactGetItemsRequest request = PostContextTransaction.build(
                "JavaContent", "JavaUserGraph", "post_1", "user_viewer", "user_author");

        assertThat(request.transactItems()).hasSize(5);
        assertThat(request.transactItems()).extracting(item -> item.get().tableName())
                .containsExactly("JavaContent", "JavaUserGraph", "JavaContent", "JavaUserGraph", "JavaUserGraph");
        assertThat(request.transactItems()).extracting(item -> item.get().key().get("PK").s())
                .containsExactly(PostMeta.partitionKey("post_1"), UserProfile.partitionKey("user_viewer"),
                        Like.PK_PREFIX + "post_1", UserProfile.partitionKey("user_author"),
                        FollowingEdge.PK_PREFIX + "user_viewer");
    }

    @Test
    void build_dedupesAuthorProfileWhenViewerIsAuthor() {
        TransactGetItemsRequest request = PostContextTransaction.build(
                "JavaContent", "JavaUserGraph", "post_1", "user_alice", "user_alice");

        assertThat(request.transactItems()).hasSize(4);
        assertThat(request.transactItems()).extracting(item -> item.get().key().get("PK").s())
                .containsExactly(PostMeta.partitionKey("post_1"), UserProfile.partitionKey("user_alice"),
                        Like.PK_PREFIX + "post_1", FollowingEdge.PK_PREFIX + "user_alice");
    }

    @Test
    void toItems_whenViewerDiffersFromAuthor_mapsFiveResponses() {
        PostMeta post = post("post_1", "user_author");
        UserProfile viewer = profile("user_viewer");
        Like like = like("post_1", "user_viewer");
        UserProfile author = profile("user_author");
        FollowingEdge following = following("user_viewer", "user_author");

        PostContextItems items = PostContextTransaction.toItems(
                response(present(POST_META_SCHEMA, post), present(PROFILE_SCHEMA, viewer),
                        present(LIKE_SCHEMA, like), present(PROFILE_SCHEMA, author),
                        present(FOLLOWING_SCHEMA, following)),
                "user_viewer", "user_author");

        assertThat(items.postMeta().getPostId()).isEqualTo("post_1");
        assertThat(items.viewerProfile().getUserId()).isEqualTo("user_viewer");
        assertThat(items.like().getUserId()).isEqualTo("user_viewer");
        assertThat(items.authorProfile().getUserId()).isEqualTo("user_author");
        assertThat(items.followingEdge().getFolloweeId()).isEqualTo("user_author");
    }

    @Test
    void toItems_whenViewerIsAuthor_reusesViewerProfileAsAuthor() {
        PostMeta post = post("post_1", "user_alice");
        UserProfile viewer = profile("user_alice");
        FollowingEdge following = following("user_alice", "user_alice");

        PostContextItems items = PostContextTransaction.toItems(
                response(present(POST_META_SCHEMA, post), present(PROFILE_SCHEMA, viewer),
                        empty(), present(FOLLOWING_SCHEMA, following)),
                "user_alice", "user_alice");

        assertThat(items.postMeta().getPostId()).isEqualTo("post_1");
        assertThat(items.viewerProfile().getUserId()).isEqualTo("user_alice");
        assertThat(items.authorProfile().getUserId()).isEqualTo("user_alice");
        assertThat(items.like()).isNull();
        assertThat(items.followingEdge().getFollowerId()).isEqualTo("user_alice");
    }

    @Test
    void toItems_whenOptionalEdgesMissing_mapsNullEdges() {
        PostMeta post = post("post_1", "user_author");
        UserProfile viewer = profile("user_viewer");
        UserProfile author = profile("user_author");

        PostContextItems items = PostContextTransaction.toItems(
                response(present(POST_META_SCHEMA, post), present(PROFILE_SCHEMA, viewer),
                        empty(), present(PROFILE_SCHEMA, author), empty()),
                "user_viewer", "user_author");

        assertThat(items.postMeta().getPostId()).isEqualTo("post_1");
        assertThat(items.like()).isNull();
        assertThat(items.followingEdge()).isNull();
    }

    @Test
    void toItems_whenPostMissingFromTransaction_mapsNullPostMeta() {
        UserProfile viewer = profile("user_viewer");
        UserProfile author = profile("user_author");

        PostContextItems items = PostContextTransaction.toItems(
                response(empty(), present(PROFILE_SCHEMA, viewer), empty(),
                        present(PROFILE_SCHEMA, author), empty()),
                "user_viewer", "user_author");

        assertThat(items.postMeta()).isNull();
        assertThat(items.viewerProfile().getUserId()).isEqualTo("user_viewer");
    }

    /**
     * Builds a transaction response from ordered item slots.
     *
     * @param responses ordered DynamoDB item responses
     * @return completed transaction response
     */
    private static TransactGetItemsResponse response(ItemResponse... responses) {
        return TransactGetItemsResponse.builder().responses(List.of(responses)).build();
    }

    /**
     * Maps a bean into a present transaction item slot.
     *
     * @param schema table schema for the bean
     * @param item   populated bean
     * @param <T>    mapped item type
     * @return item response containing the mapped attributes
     */
    private static <T> ItemResponse present(TableSchema<T> schema, T item) {
        return ItemResponse.builder().item(schema.itemToMap(item, true)).build();
    }

    /**
     * Builds an empty transaction item slot.
     *
     * @return item response with no attributes
     */
    private static ItemResponse empty() {
        return ItemResponse.builder().build();
    }

    /**
     * Builds post metadata for mapping tests.
     *
     * @param postId   post id
     * @param authorId author user id
     * @return populated post metadata bean
     */
    private static PostMeta post(String postId, String authorId) {
        PostMeta meta = new PostMeta();
        meta.setPk(PostMeta.partitionKey(postId));
        meta.setSk(PostMeta.SORT_KEY);
        meta.setEntityType(PostMeta.ENTITY_TYPE);
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setType("POST");
        meta.setVisibility("PUBLIC");
        meta.setText("Hello followers");
        meta.setCreatedAt("2026-05-27T11:00:00Z");
        meta.setLikeCount(0L);
        return meta;
    }

    /**
     * Builds a profile bean for mapping tests.
     *
     * @param userId profile owner
     * @return populated profile bean
     */
    private static UserProfile profile(String userId) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(userId));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(userId);
        profile.setDisplayName(userId);
        profile.setCreatedAt("2026-05-27T10:00:00Z");
        return profile;
    }

    /**
     * Builds a like edge for mapping tests.
     *
     * @param postId post that was liked
     * @param userId liker
     * @return populated like bean
     */
    private static Like like(String postId, String userId) {
        Like like = new Like();
        like.setPk(Like.PK_PREFIX + postId);
        like.setSk(Like.sortKey(userId));
        like.setEntityType(Like.ENTITY_TYPE);
        like.setPostId(postId);
        like.setUserId(userId);
        like.setCreatedAt("2026-05-27T11:05:00Z");
        return like;
    }

    /**
     * Builds a following edge for mapping tests.
     *
     * @param followerId viewer
     * @param followeeId author
     * @return populated following-edge bean
     */
    private static FollowingEdge following(String followerId, String followeeId) {
        FollowingEdge edge = new FollowingEdge();
        edge.setPk(FollowingEdge.PK_PREFIX + followerId);
        edge.setSk(FollowingEdge.sortKey(followeeId));
        edge.setEntityType(FollowingEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt("2026-05-27T09:00:00Z");
        return edge;
    }
}

