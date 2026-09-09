package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentPostTransaction;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;

/**
 * Unit coverage for the atomic Content-table source write used by post publication.
 */
@Tag("unit")
class ContentPostTransactionTest {

    private static final String TABLE_NAME = "JavaContent";
    private static final String POST_ID = "post_1";
    private static final String AUTHOR_ID = "user_1";
    private static final String CREATED_AT = "2026-08-07T00:00:00Z";

    @Test
    void buildCreatesConditionalMetadataAndAuthorProjectionWrites() {
        PostMapper mapper = new PostMapper();
        PostMeta meta = mapper.toPostMeta(POST_ID, AUTHOR_ID, "POST", Visibility.PUBLIC, null, "text",
                CREATED_AT, null, List.of());
        UserPost userPost = mapper.toUserPost(meta);

        TransactWriteItemsRequest request = ContentPostTransaction.build(TABLE_NAME, meta, userPost);

        assertThat(request.transactItems()).hasSize(2);
        assertThat(request.transactItems().get(0).put().tableName()).isEqualTo(TABLE_NAME);
        assertThat(request.transactItems().get(0).put().conditionExpression()).isEqualTo("attribute_not_exists(PK)");
        assertThat(request.transactItems().get(0).put().item()).containsEntry("entityType",
                AttributeValue.fromS(PostMeta.ENTITY_TYPE));
        assertThat(request.transactItems().get(1).put().tableName()).isEqualTo(TABLE_NAME);
        assertThat(request.transactItems().get(1).put().conditionExpression()).isEqualTo("attribute_not_exists(PK)");
        assertThat(request.transactItems().get(1).put().item()).containsEntry("entityType",
                AttributeValue.fromS(UserPost.ENTITY_TYPE));
    }
}
