package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxItemResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxPageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.InboxMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.InboxPage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.InboxService;

/**
 * Unit coverage for the operation 9 list-inbox read. No Docker or Spring context is
 * required. The repositories are mocked so limit normalization, type validation, direction pass-through,
 * user-existence gating, and page assembly are exercised in isolation. The real mapper keeps the
 * response shape honest.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class InboxServiceTest {

    private static final String USER = "user_bob";

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private UserGraphRepository userGraphRepository;

    private InboxService service;

    @BeforeEach
    void setUp() {
        service = new InboxService(conversationRepository, userGraphRepository, new InboxMapper());
    }

    @Test
    void readInbox_withAbsentLimit_defaultsToFifty() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, null, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(50), eq(false), any());
    }

    @Test
    void readInbox_withLimitOne_passesThrough() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, 1, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(1), eq(false), any());
    }

    @Test
    void readInbox_withLimitFifty_passesThrough() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, 50, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(50), eq(false), any());
    }

    @Test
    void readInbox_withLimitOneHundred_passesThrough() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, 100, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(100), eq(false), any());
    }

    @Test
    void readInbox_withSuppliedLimitAboveFifty_passesThrough() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, 51, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(51), eq(false), any());
    }

    @Test
    void readInbox_withNonPositiveLimit_throwsValidationError() {
        assertThatThrownBy(() -> service.readInbox(USER, null, 0, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
        assertThatThrownBy(() -> service.readInbox(USER, null, -1, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
    }

    @Test
    void readInbox_withLimitAboveMaximum_throwsValidationError() {
        assertThatThrownBy(() -> service.readInbox(USER, null, 101, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
    }

    @Test
    void inRangeLimitAndDirectionPassThrough() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, null, 10, true, null).join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(10), eq(true), any());
    }

    @Test
    void typeFilterPassesCanonicalNameToRepository() {
        stubProfileExists();
        stubEmptyPage();

        service.readInbox(USER, "GROUP", 20, false, null).join();

        verify(conversationRepository).queryInbox(eq(USER), eq("GROUP"), eq(20), eq(false), any());
    }

    @Test
    void invalidTypeThrowsValidationError() {
        stubProfileExists();

        assertThatThrownBy(() -> service.readInbox(USER, "CHANNEL", 20, false, null))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void unknownUserThrowsUserNotFound() {
        when(userGraphRepository.getProfile(USER))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.readInbox(USER, null, 20, false, null).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
    }

    @Test
    void emptyInboxReturnsEmptyItemsAndNoToken() {
        stubProfileExists();
        stubEmptyPage();

        InboxPageResponse response = service.readInbox(USER, null, 20, false, null).join();

        assertThat(response.userId()).isEqualTo(USER);
        assertThat(response.items()).isEmpty();
        assertThat(response.nextToken()).isNull();
    }

    @Test
    void mapsEntriesAndCarriesNextToken() {
        stubProfileExists();
        InboxEntry group = entry("conv_study_group", "GROUP", "Study group", "See you at 3",
                "2026-05-27T14:00:00Z");
        InboxEntry direct = entry("conv_alice_bob", "DIRECT_MESSAGE", null, "Are you free?",
                "2026-05-27T13:00:00Z");
        when(conversationRepository.queryInbox(eq(USER), isNull(), eq(20), eq(false), any()))
                .thenReturn(CompletableFuture.completedFuture(
                        new InboxPage(List.of(group, direct), "next-token")));

        InboxPageResponse response = service.readInbox(USER, null, 20, false, null).join();

        assertThat(response.nextToken()).isEqualTo("next-token");
        assertThat(response.items()).hasSize(2);

        InboxItemResponse first = response.items().get(0);
        assertThat(first.conversationId()).isEqualTo("conv_study_group");
        assertThat(first.type()).isEqualTo("GROUP");
        assertThat(first.title()).isEqualTo("Study group");
        assertThat(first.lastMessagePreview()).isEqualTo("See you at 3");
        assertThat(first.lastActivityAt()).isEqualTo("2026-05-27T14:00:00Z");

        InboxItemResponse second = response.items().get(1);
        assertThat(second.type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(second.title()).isNull();
    }

    @Test
    void nextTokenPassesThroughToRepository() {
        stubProfileExists();
        when(conversationRepository.queryInbox(eq(USER), isNull(), eq(20), eq(false), eq("prev-token")))
                .thenReturn(CompletableFuture.completedFuture(new InboxPage(List.of(), null)));

        service.readInbox(USER, null, 20, false, "prev-token").join();

        verify(conversationRepository).queryInbox(eq(USER), isNull(), eq(20), eq(false), eq("prev-token"));
    }

    private void stubProfileExists() {
        UserProfile profile = new UserProfile();
        profile.setUserId(USER);
        lenient().when(userGraphRepository.getProfile(USER))
                .thenReturn(CompletableFuture.completedFuture(profile));
    }

    private void stubEmptyPage() {
        lenient().when(conversationRepository.queryInbox(any(), any(), any(Integer.class), any(Boolean.class), any()))
                .thenReturn(CompletableFuture.completedFuture(new InboxPage(List.of(), null)));
    }

    private InboxEntry entry(String conversationId, String type, String title, String preview,
                             String lastActivityAt) {
        InboxEntry entry = new InboxEntry();
        entry.setPk(InboxEntry.partitionKey(USER));
        entry.setSk(InboxEntry.sortKey(conversationId));
        entry.setEntityType(InboxEntry.ENTITY_TYPE);
        entry.setInboxUserId(USER);
        entry.setConversationType(type);
        entry.setLastActivityAt(lastActivityAt);
        entry.setConversationId(conversationId);
        entry.setTitle(title);
        entry.setLastMessagePreview(preview);
        return entry;
    }
}
