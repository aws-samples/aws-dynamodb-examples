package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.converter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import software.amazon.awssdk.annotations.Immutable;
import software.amazon.awssdk.annotations.ThreadSafe;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.enhanced.dynamodb.AttributeConverter;
import software.amazon.awssdk.enhanced.dynamodb.AttributeValueType;
import software.amazon.awssdk.enhanced.dynamodb.EnhancedType;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

/**
 * Converts a {@code List<MediaRef>} to and from a DynamoDB list attribute.
 *
 * <p>The {@code media[]} list on {@code PostMeta} and {@code UserPost} is stored as a native
 * DynamoDB list ({@code L}) of maps ({@code M}), one map per {@link MediaRef}. Optional numeric
 * fields ({@code sizeBytes}, {@code width}, {@code height}, {@code durationSeconds}) are omitted from
 * the map when {@code null} so absent metadata does not persist empty attributes.
 *
 * <p>The type is stateless. {@link #create()} is provided for readability and is equivalent to the
 * public no-arg constructor.
 */
@ThreadSafe
@Immutable
public final class MediaRefAttributeConverter implements AttributeConverter<List<MediaRef>> {

private static final String MEDIA_ID = "mediaId";
private static final String KIND = "kind";
private static final String CONTENT_TYPE = "contentType";
private static final String S3_BUCKET = "s3Bucket";
private static final String S3_KEY = "s3Key";
private static final String SIZE_BYTES = "sizeBytes";
private static final String WIDTH = "width";
private static final String HEIGHT = "height";
private static final String DURATION_SECONDS = "durationSeconds";

    /** Public no-arg constructor for {@code @DynamoDbConvertedBy} and tooling. Prefer {@link #create()}. */
    public MediaRefAttributeConverter() {
    }

    /**
     * Factory for a new converter instance (same as the public no-arg constructor).
     *
     * @return new stateless converter, safe to use concurrently across threads
     */
    public static MediaRefAttributeConverter create() {
        return new MediaRefAttributeConverter();
    }

    /**
     * @param input list of media references, may be null or empty
     * @return DynamoDB list attribute {@code L} of {@code M} maps
     */
    @Override
    public AttributeValue transformFrom(List<MediaRef> input) {
        List<AttributeValue> elements = new ArrayList<>();
        if (input != null) {
            for (MediaRef ref : input) {
                elements.add(toMap(ref));
            }
        }
        return AttributeValue.builder().l(elements).build();
    }

    /**
     * @param input list attribute produced by {@link #transformFrom(List)}, or a null list
     * @return reconstructed list of media references (empty when the attribute is absent or empty)
     */
    @Override
    public List<MediaRef> transformTo(AttributeValue input) {
        List<MediaRef> result = new ArrayList<>();
        if (input == null || input.l() == null) {
            return result;
        }
        for (AttributeValue element : input.l()) {
            result.add(fromMap(element.m()));
        }
        return result;
    }

    /** {@inheritDoc} */
    @Override
    public EnhancedType<List<MediaRef>> type() {
        return EnhancedType.listOf(MediaRef.class);
    }

    /** {@inheritDoc} */
    @Override
    public AttributeValueType attributeValueType() {
        return AttributeValueType.L;
    }

    /**
     * Encodes one media reference as a DynamoDB map, omitting absent optional numeric fields.
     *
     * @param ref the media reference
     * @return a map ({@code M}) attribute value
     */
    private static AttributeValue toMap(MediaRef ref) {
        Map<String, AttributeValue> map = new LinkedHashMap<>();
        putString(map, MEDIA_ID, ref.mediaId());
        putString(map, KIND, ref.kind());
        putString(map, CONTENT_TYPE, ref.contentType());
        putString(map, S3_BUCKET, ref.s3Bucket());
        putString(map, S3_KEY, ref.s3Key());
        putNumber(map, SIZE_BYTES, ref.sizeBytes());
        putNumber(map, WIDTH, ref.width());
        putNumber(map, HEIGHT, ref.height());
        putNumber(map, DURATION_SECONDS, ref.durationSeconds());
        return AttributeValue.builder().m(map).build();
    }

    /**
     * Decodes one media reference from a DynamoDB map.
     *
     * @param map the map attribute, may be null
     * @return the reconstructed media reference
     */
    private static MediaRef fromMap(Map<String, AttributeValue> map) {
        if (map == null) {
            return new MediaRef(null, null, null, null, null, null, null, null, null);
        }
        return new MediaRef(
                readString(map, MEDIA_ID),
                readString(map, KIND),
                readString(map, CONTENT_TYPE),
                readString(map, S3_BUCKET),
                readString(map, S3_KEY),
                readLong(map, SIZE_BYTES),
                readInteger(map, WIDTH),
                readInteger(map, HEIGHT),
                readInteger(map, DURATION_SECONDS));
    }

    private static void putString(Map<String, AttributeValue> map, String key, String value) {
        if (value != null) {
            map.put(key, AttributeValue.builder().s(value).build());
        }
    }

    private static void putNumber(Map<String, AttributeValue> map, String key, Number value) {
        if (value != null) {
            map.put(key, AttributeValue.builder().n(value.toString()).build());
        }
    }

    private static String readString(Map<String, AttributeValue> map, String key) {
        AttributeValue value = map.get(key);
        return value == null ? null : value.s();
    }

    private static Long readLong(Map<String, AttributeValue> map, String key) {
        AttributeValue value = map.get(key);
        return value == null || value.n() == null ? null : Long.valueOf(value.n());
    }

    private static Integer readInteger(Map<String, AttributeValue> map, String key) {
        AttributeValue value = map.get(key);
        return value == null || value.n() == null ? null : Integer.valueOf(value.n());
    }
}
