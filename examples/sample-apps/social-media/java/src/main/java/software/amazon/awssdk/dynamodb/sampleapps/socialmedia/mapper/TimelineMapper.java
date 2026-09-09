package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.util.List;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelineEntryResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelinePageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;

/**
 * Builds the home-timeline response shape.
 *
 * <p>Maps each denormalized {@code TIMELINE_ENTRY} row to a response entry and assembles the page.
 * Media references are enriched by the caller with time-limited presigned download URLs, so the
 * response never exposes a raw bucket or key.
 */
@Component
public class TimelineMapper {

    /**
     * Maps one stored media reference to a response element carrying a presigned download URL.
     *
     * @param ref the stored media reference
     * @param url the presigned {@code GET} URL
     * @return the response element
     */
    public MediaResponse toMediaResponse(MediaRef ref, String url) {
        return new MediaResponse(
                ref.mediaId(),
                ref.kind(),
                ref.contentType(),
                url,
                ref.sizeBytes(),
                ref.width(),
                ref.height(),
                ref.durationSeconds());
    }

    /**
     * Maps one timeline entry plus its enriched media to a response entry.
     *
     * @param entry the stored timeline entry
     * @param media media responses carrying presigned URLs, or {@code null} when the post has none
     * @return the response entry
     */
    public TimelineEntryResponse toEntryResponse(TimelineEntry entry, List<MediaResponse> media) {
        return new TimelineEntryResponse(
                entry.getPostId(),
                entry.getAuthorId(),
                entry.getText(),
                entry.getCreatedAt(),
                media);
    }

    /**
     * Assembles a full timeline page response.
     *
     * @param userId    the timeline owner echoed from the path
     * @param items     mapped timeline entries for this page
     * @param nextToken opaque continuation token, or {@code null} on the final page
     * @return the page response
     */
    public TimelinePageResponse toPageResponse(String userId, List<TimelineEntryResponse> items, String nextToken) {
        return new TimelinePageResponse(userId, items, nextToken);
    }
}
