package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidMediaException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaValidator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.S3MediaGateway;

/**
 * Unit coverage for the operation 3 supporting media upload prelude. No Docker or Spring
 * context is required. The repository and S3 gateway are mocked so the actor, existence, and media
 * validation branches are exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    private static final String BUCKET = "test-bucket";

    @Mock
    private UserGraphRepository userGraphRepository;

    @Mock
    private S3MediaGateway s3MediaGateway;

    private MediaService service;

    @BeforeEach
    void setUp() {
        MediaProperties properties = new MediaProperties(
                BUCKET, "media/", 900, 3,
                List.of("image/jpeg", "image/png"), List.of("video/mp4"),
                10_485_760L, 104_857_600L);
        service = new MediaService(userGraphRepository, new MediaValidator(properties), s3MediaGateway, properties);
    }

    @Test
    void validRequestReturnsPresignedUpload() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_alice")));
        when(s3MediaGateway.presignUpload(eq(BUCKET), anyString(), eq("image/jpeg")))
                .thenReturn("https://s3.example/upload?sig");

        CreateMediaUploadResponse response = service.createUpload("user_alice",
                new CreateMediaUploadRequest("IMAGE", "image/jpeg", 482_310L)).join();

        assertThat(response.mediaId()).startsWith("media_");
        assertThat(response.kind()).isEqualTo("IMAGE");
        assertThat(response.contentType()).isEqualTo("image/jpeg");
        assertThat(response.uploadUrl()).isEqualTo("https://s3.example/upload?sig");
        assertThat(response.uploadMethod()).isEqualTo("PUT");
        assertThat(response.expiresAt()).endsWith("Z");
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.createUpload("  ",
                new CreateMediaUploadRequest("IMAGE", "image/jpeg", null)))
                .isInstanceOf(MissingActorException.class);
    }

    @Test
    void unknownUploaderRaisesUserNotFound() {
        when(userGraphRepository.getProfile(eq("user_ghost")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.createUpload("user_ghost",
                new CreateMediaUploadRequest("IMAGE", "image/jpeg", null)).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
    }

    @Test
    void unknownKindThrowsInvalidMedia() {
        assertThatThrownBy(() -> service.createUpload("user_alice",
                new CreateMediaUploadRequest("AUDIO", "audio/mpeg", null)))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void oversizedDeclaredSizeThrowsInvalidMedia() {
        assertThatThrownBy(() -> service.createUpload("user_alice",
                new CreateMediaUploadRequest("IMAGE", "image/jpeg", 10_485_761L)))
                .isInstanceOf(InvalidMediaException.class);
    }

    private static UserProfile profile(String userId) {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setDisplayName(userId);
        profile.setCreatedAt("2026-05-27T10:00:00Z");
        return profile;
    }
}
