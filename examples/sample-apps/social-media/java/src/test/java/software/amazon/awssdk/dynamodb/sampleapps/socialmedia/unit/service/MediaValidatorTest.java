package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidMediaException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaKind;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaValidator;

/**
 * Unit coverage for the operation 3 media validation rules. No Docker or Spring context
 * is required. Exercises the recognized kind, allowed content types, kind/content-type agreement,
 * per-post attachment cap, and per-object size limits.
 */
@Tag("unit")
class MediaValidatorTest {

    private static final long MAX_IMAGE_BYTES = 10_485_760L;
    private static final long MAX_VIDEO_BYTES = 104_857_600L;

    private MediaValidator validator;

    @BeforeEach
    void setUp() {
        MediaProperties properties = new MediaProperties(
                "test-bucket",
                "media/",
                900,
                3,
                List.of("image/jpeg", "image/png"),
                List.of("video/mp4"),
                MAX_IMAGE_BYTES,
                MAX_VIDEO_BYTES);
        validator = new MediaValidator(properties);
    }

    @Test
    void validImageKindAndContentTypeParses() {
        assertThat(validator.validateKindAndContentType("IMAGE", "image/jpeg")).isEqualTo(MediaKind.IMAGE);
    }

    @Test
    void validVideoKindAndContentTypeParses() {
        assertThat(validator.validateKindAndContentType("VIDEO", "video/mp4")).isEqualTo(MediaKind.VIDEO);
    }

    @Test
    void unknownKindIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateKindAndContentType("AUDIO", "image/jpeg"))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void disallowedImageContentTypeIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateKindAndContentType("IMAGE", "image/tiff"))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void kindContentTypeMismatchIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateKindAndContentType("IMAGE", "video/mp4"))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void declaredSizeOverImageLimitIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateDeclaredSize(MediaKind.IMAGE, MAX_IMAGE_BYTES + 1))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void declaredSizeWithinLimitPasses() {
        assertThatCode(() -> validator.validateDeclaredSize(MediaKind.VIDEO, MAX_VIDEO_BYTES))
                .doesNotThrowAnyException();
    }

    @Test
    void nullDeclaredSizeSkipsCheck() {
        assertThatCode(() -> validator.validateDeclaredSize(MediaKind.IMAGE, null)).doesNotThrowAnyException();
    }

    @Test
    void objectSizeOverVideoLimitIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateObjectSize(MediaKind.VIDEO, MAX_VIDEO_BYTES + 1))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void attachmentCountOverCapIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validatePostAttachmentCount(4))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void attachmentCountAtCapPasses() {
        assertThatCode(() -> validator.validatePostAttachmentCount(3)).doesNotThrowAnyException();
    }

    @Test
    void storyWithTwoAttachmentsIsInvalidMedia() {
        assertThatThrownBy(() -> validator.validateStoryAttachmentCount(2))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void storyWithAtMostOneAttachmentPasses() {
        assertThatCode(() -> validator.validateStoryAttachmentCount(0)).doesNotThrowAnyException();
        assertThatCode(() -> validator.validateStoryAttachmentCount(1)).doesNotThrowAnyException();
    }
}
