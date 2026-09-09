package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;

/**
 * Derives deterministic domain identities from client-supplied request identifiers.
 *
 * <p>The result is opaque, stable for one request identifier, and safe to embed in a DynamoDB key.
 */
public final class RequestIdentity {

    /** Utility class, not instantiable. */
    private RequestIdentity() {
    }

    /**
     * Derives a fixed-length lowercase hexadecimal identity from a request identifier and operation scope.
     *
     * @param operation operation-specific namespace
     * @param clientRequestId stable client request identifier
     * @return deterministic 64-character hexadecimal identity
     */
    public static String stableId(String operation, String clientRequestId) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((operation + "\u0000" + clientRequestId).getBytes(StandardCharsets.UTF_8));
            StringBuilder value = new StringBuilder(digest.length * 2);
            for (byte current : digest) {
                value.append(String.format("%02x", current));
            }
            return value.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    /**
     * Derives the canonical fingerprint for a replayable conversation create. Participant order is
     * deliberately ignored; creator, type, title, and member set remain part of the identity.
     *
     * @param creatorId conversation creator
     * @param type conversation type
     * @param title group title, or {@code null}
     * @param participantUserIds distinct participant ids
     * @return deterministic opaque fingerprint
     */
    public static String conversationFingerprint(String creatorId, String type, String title,
                                                 List<String> participantUserIds) {
        List<String> normalizedParticipants = new ArrayList<>(participantUserIds);
        Collections.sort(normalizedParticipants);
        return stableId("conversation-create", encode(creatorId) + encode(type) + encode(title)
                + encode(String.join("\u0000", normalizedParticipants)));
    }

    /**
     * Derives the canonical fingerprint for a replayable message send.
     *
     * @param senderId authenticated sender identity
     * @param text message text
     * @return deterministic opaque fingerprint
     */
    public static String messageFingerprint(String senderId, String text) {
        return stableId("message-send", encode(senderId) + encode(text));
    }

    /**
     * Derives the canonical fingerprint for a replayable post publication. Viewer order is ignored
     * because a restricted allow list is a set, while media order remains part of the publication.
     *
     * @param authorId post author
     * @param type post type
     * @param visibility publication visibility
     * @param allowedViewerUserIds restricted viewers, or {@code null}
     * @param text normalized post text, or {@code null}
     * @param media ordered resolved media references
     * @return deterministic opaque fingerprint
     */
    public static String postFingerprint(String authorId, String type, String visibility,
                                         List<String> allowedViewerUserIds, String text, List<MediaRef> media) {
        List<String> normalizedViewers = allowedViewerUserIds == null ? new ArrayList<>()
                : new ArrayList<>(allowedViewerUserIds);
        Collections.sort(normalizedViewers);
        StringBuilder value = new StringBuilder();
        value.append(encode(authorId)).append(encode(type)).append(encode(visibility)).append(encode(text));
        value.append(encode(String.join("\u0000", normalizedViewers)));
        for (MediaRef ref : media) {
            value.append(encode(ref.mediaId())).append(encode(ref.kind())).append(encode(ref.contentType()))
                    .append(encode(ref.s3Bucket())).append(encode(ref.s3Key()))
                    .append(encode(String.valueOf(ref.sizeBytes()))).append(encode(String.valueOf(ref.width())))
                    .append(encode(String.valueOf(ref.height()))).append(encode(String.valueOf(ref.durationSeconds())));
        }
        return stableId("post-publish", value.toString());
    }

    /** Length-prefixes nullable values so fingerprint components cannot collide through concatenation. */
    private static String encode(String value) {
        return value == null ? "-1:" : value.length() + ":" + value;
    }
}
