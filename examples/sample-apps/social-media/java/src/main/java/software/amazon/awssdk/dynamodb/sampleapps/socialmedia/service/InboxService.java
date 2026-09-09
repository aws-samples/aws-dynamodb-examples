package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxItemResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxPageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.InboxMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.InboxPage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;

/**
 * Lists a user's conversations ordered by most recent activity.
 *
 * <p>The observable step order is fixed regardless of client type: validate the {@code type} filter
 * and the {@code limit} first, then confirm the inbox owner has a profile
 * ({@code 404 USER_NOT_FOUND}), then read one page from {@code GSI_INBOX} through the
 * {@link ConversationRepository}. When {@code type} is set the repository runs a single filtered
 * {@code Query}. When {@code type} is omitted it runs two parallel queries and merge-sorts by
 * {@code lastActivityAt}, bundling a per-partition continuation cursor into one opaque token.
 * An omitted {@code limit} defaults to 50. A supplied {@code limit} must be 1 through 100 or the
 * read fails with {@link ValidationException}.
 *
 * <p>The read is eventually consistent by definition for a GSI projection. The opaque {@code nextToken}
 * is route-specific and type-mode specific: a token minted for the timeline route or for the other
 * type mode is rejected downstream when its discriminator is validated. DynamoDB I/O stays
 * async end-to-end.
 */
@Service
public class InboxService {

    private static final Logger logger = LoggerFactory.getLogger(InboxService.class);

static final int DEFAULT_LIMIT = 50;

static final int MIN_LIMIT = 1;

static final int MAX_LIMIT = 100;

private final ConversationRepository conversationRepository;
private final UserGraphRepository userGraphRepository;
private final InboxMapper inboxMapper;

    /**
     * @param conversationRepository Conversations persistence boundary
     * @param userGraphRepository    UserGraph persistence boundary
     * @param inboxMapper            response mapping
     */
    public InboxService(ConversationRepository conversationRepository,
                        UserGraphRepository userGraphRepository,
                        InboxMapper inboxMapper) {
        this.conversationRepository = conversationRepository;
        this.userGraphRepository = userGraphRepository;
        this.inboxMapper = inboxMapper;
    }

    /**
     * Reads one page of the given user's inbox.
     *
     * @param userId           inbox owner from the path
     * @param type             optional conversation type filter ({@code DIRECT_MESSAGE} or {@code GROUP})
     * @param limit            requested page size, or {@code null} for the default of 50. Accepted
     *                         values are 1 through 100
     * @param scanIndexForward {@code false} for most-recent activity first (default), {@code true} for oldest first
     * @param nextToken        opaque continuation from a prior page, or {@code null} for the first page
     * @return a future completing with the page response
     * @throws ValidationException   when {@code type} is present but not a valid conversation type,
     *                               or when a supplied {@code limit} is outside 1 through 100
     * @throws UserNotFoundException when the inbox owner has no profile
     */
    public CompletableFuture<InboxPageResponse> readInbox(String userId,
                                                          String type,
                                                          Integer limit,
                                                          boolean scanIndexForward,
                                                          String nextToken) {
        String normalizedType = normalizeType(type);
        int effectiveLimit = normalizeLimit(limit);
        logger.debug("Reading inbox [userId={}, type={}, limit={}, scanIndexForward={}, paged={}]",
                userId, normalizedType, effectiveLimit, scanIndexForward, nextToken != null);

        return userGraphRepository.getProfile(userId)
                .thenCompose(profile -> {
                    if (profile == null) {
                        throw new UserNotFoundException(userId);
                    }
                    return conversationRepository.queryInbox(
                            userId, normalizedType, effectiveLimit, scanIndexForward, nextToken);
                })
                .thenApply(page -> buildResponse(userId, page));
    }

    /** Builds the page response from the repository page. */
    private InboxPageResponse buildResponse(String userId, InboxPage page) {
        List<InboxItemResponse> items = new ArrayList<>();
        for (InboxEntry entry : page.items()) {
            items.add(inboxMapper.toItemResponse(entry));
        }
        return inboxMapper.toPageResponse(userId, items, page.nextToken());
    }

    /**
     * Validates the optional {@code type} filter. An absent or blank value means the merged mode, and
     * any non-empty value must be a recognized conversation type.
     *
     * @param type the raw type query parameter
     * @return the canonical type name, or {@code null} for the merged mode
     * @throws ValidationException when a present value is not a valid conversation type
     */
    private String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return ConversationType.valueOf(type).name();
        } catch (IllegalArgumentException e) {
            throw new ValidationException("type must be DIRECT_MESSAGE or GROUP: " + type);
        }
    }

    /**
     * Defaults an omitted page size and validates that a supplied page size is 1 through 100.
     *
     * @param limit the requested page size, or {@code null}
     * @return the supplied or default page size
     * @throws ValidationException when a supplied page size is outside 1 through 100
     */
    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new ValidationException("limit must be between 1 and 100");
        }
        return limit;
    }
}
