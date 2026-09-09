package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.MessageMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbMessageRepository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsResponse;

/**
 * Unit coverage for the atomic replayable-message source transaction.
 *
 * <p>The transaction must create the message row and its stable request record together, with a
 * condition on each row so a retry cannot overwrite either source of truth.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class MessageReplayRepositoryTest {

    private static final String TABLE = "JavaMessages";

    @Mock
    private DynamoDbAsyncClient client;

    @Test
    void putMessageWithRequest_createsBothConditionalSourceRowsAtomically() {
        ArgumentCaptor<TransactWriteItemsRequest> captor = ArgumentCaptor.forClass(TransactWriteItemsRequest.class);
        when(client.transactWriteItems(captor.capture())).thenReturn(CompletableFuture.completedFuture(
                TransactWriteItemsResponse.builder().build()));
        Message message = new MessageMapper().toMessage("msg_request_123", "conv_123", "user_alice",
                "Hello", "2026-08-07T10:00:00Z");
        MessageRequest request = new MessageMapper().toRequest(message, "fingerprint");

        new LowLevelDynamoDbMessageRepository(client, TABLE).putMessageWithRequest(message, request).join();

        TransactWriteItemsRequest transaction = captor.getValue();
        assertThat(transaction.transactItems()).hasSize(2);
        assertThat(transaction.transactItems()).allSatisfy(item ->
                assertThat(item.put().conditionExpression()).isEqualTo("attribute_not_exists(SK)"));
        assertThat(transaction.transactItems().get(0).put().item()).containsEntry("entityType",
                AttributeValue.fromS(Message.ENTITY_TYPE));
        assertThat(transaction.transactItems().get(1).put().item()).containsEntry("entityType",
                AttributeValue.fromS(MessageRequest.ENTITY_TYPE));
    }
}
