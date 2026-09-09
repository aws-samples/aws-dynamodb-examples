package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.util.List;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.AuthorSummaryResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PostContextResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PostSummaryResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;

/**
 * Builds the post-context response shape.
 *
 * <p>Merges the items assembled by the multi-table {@code TransactGetItems} into one payload: the
 * post summary (with presigned media URLs supplied by the caller), the author summary, and the
 * viewer's follow and like state. Missing optional edges surface as {@code isFollowing=false} and
 * {@code likedByViewer=false}.
 */
@Component
public class PostContextMapper {

    /**
     * Assembles the post-context response from the already-resolved snapshot pieces.
     *
     * @param meta          the {@code POST_META} row
     * @param media         media responses carrying presigned download URLs, or {@code null} when none
     * @param authorProfile the author's profile row, or {@code null} when read back empty
     * @param authorId      the author id, used as a fallback when the profile row is absent
     * @param isFollowing   {@code true} when the viewer follows the author
     * @param likedByViewer {@code true} when the viewer has liked the post
     * @return the post-context response
     */
    public PostContextResponse toResponse(PostMeta meta, List<MediaResponse> media, UserProfile authorProfile,
                                          String authorId, boolean isFollowing, boolean likedByViewer) {
        PostSummaryResponse post = new PostSummaryResponse(
                meta.getPostId(),
                meta.getAuthorId(),
                meta.getText(),
                meta.getCreatedAt(),
                meta.getLikeCount() == null ? 0L : meta.getLikeCount(),
                meta.getType(),
                meta.getVisibility(),
                meta.getAllowedViewerUserIds(),
                media);
        AuthorSummaryResponse author = new AuthorSummaryResponse(
                authorProfile != null ? authorProfile.getUserId() : authorId,
                authorProfile != null ? authorProfile.getDisplayName() : null);
        return new PostContextResponse(post, author, isFollowing, likedByViewer);
    }
}
