package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.io.IOException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidPaginationTokenException;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

/**
 * Encodes and decodes opaque API pagination tokens backed by DynamoDB {@code LastEvaluatedKey} maps.
 *
 * <p>The reference encoding is URL-safe Base64 without padding of the serialized key map. Each
 * attribute carries an explicit DynamoDB type tag ({@code S}, {@code N}, {@code BOOL}, {@code NULL},
 * {@code B}, {@code SS}, {@code NS}, {@code BS}) so the exact attribute-value shape round-trips into
 * the next {@code ExclusiveStartKey}.
 *
 * <p>Tokens are route-specific. Callers validate the route-specific discriminator with
 * {@link #requireKeyAttribute(Map, String, String)} (for example {@code timelinePostId} for the
 *  timeline route, {@code conversationType} for the  inbox route). A malformed or
 * wrong-route token raises {@link InvalidPaginationTokenException} (HTTP {@code 400}).
 */
public final class PaginationTokenCodec {

private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /** Utility class, not instantiable. */
    private PaginationTokenCodec() {
    }

    /**
     * Encodes a DynamoDB {@code LastEvaluatedKey} map as an opaque URL-safe Base64 token.
     *
     * @param lastEvaluatedKey pagination key from a query response, or empty for no continuation
     * @return encoded token, or {@code null} when there is no next page
     */
    public static String encode(Map<String, AttributeValue> lastEvaluatedKey) {
        if (lastEvaluatedKey == null || lastEvaluatedKey.isEmpty()) {
            return null;
        }
        try {
            Map<String, EncodedAttributeValue> payload = new TreeMap<>();
            lastEvaluatedKey.forEach((name, value) -> payload.put(name, encodeAttributeValue(value)));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(OBJECT_MAPPER.writeValueAsBytes(payload));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to encode pagination token", e);
        }
    }

    /**
     * Decodes an opaque pagination token back into a DynamoDB exclusive start key map.
     *
     * @param nextToken encoded token from a prior response, or blank for the first page
     * @return decoded key map, or {@code null} when no token was supplied
     * @throws InvalidPaginationTokenException when the token is malformed or empty after decoding
     */
    public static Map<String, AttributeValue> decode(String nextToken) {
        if (nextToken == null || nextToken.isBlank()) {
            return null;
        }
        try {
            byte[] json = Base64.getUrlDecoder().decode(nextToken);
            Map<String, EncodedAttributeValue> payload = OBJECT_MAPPER.readValue(json, new TypeReference<>() {
            });
            if (payload == null || payload.isEmpty()) {
                throw new InvalidPaginationTokenException(nextToken);
            }
            Map<String, AttributeValue> key = new LinkedHashMap<>();
            payload.forEach((name, value) -> key.put(name, decodeAttributeValue(value, nextToken)));
            return Map.copyOf(key);
        } catch (IllegalArgumentException | IOException e) {
            throw new InvalidPaginationTokenException(nextToken, e);
        }
    }

    /**
     * Validates that a decoded key map contains the required route-specific discriminator attribute.
     * A token issued by a different route lacks the expected attribute and is rejected.
     *
     * @param decoded     result of {@link #decode(String)}, must not be {@code null}
     * @param requiredKey attribute name that must be present in the decoded key map
     * @param nextToken   original opaque token string (used in the exception)
     * @throws InvalidPaginationTokenException if {@code requiredKey} is absent from {@code decoded}
     */
    public static void requireKeyAttribute(Map<String, AttributeValue> decoded,
                                           String requiredKey,
                                           String nextToken) {
        if (decoded == null || !decoded.containsKey(requiredKey)) {
            throw new InvalidPaginationTokenException(nextToken);
        }
    }

    /**
     * Validates that a decoded continuation key contains every attribute required by its table and
     * index key schema.
     *
     * @param decoded      decoded token payload
     * @param requiredKeys complete key attribute names
     * @param nextToken    original opaque token string
     * @throws InvalidPaginationTokenException when an attribute is absent or has no value
     */
    public static void requireCompleteKey(Map<String, AttributeValue> decoded,
                                          List<String> requiredKeys,
                                          String nextToken) {
        if (decoded == null || requiredKeys.stream().anyMatch(key -> {
            AttributeValue value = decoded.get(key);
            return value == null || !hasValue(value);
        })) {
            throw new InvalidPaginationTokenException(nextToken);
        }
    }

    /**
     * Converts one DynamoDB {@link AttributeValue} into a JSON-friendly encoded form.
     *
     * @param value attribute value from a {@code LastEvaluatedKey} entry
     * @return encoded representation for the token payload
     */
    private static EncodedAttributeValue encodeAttributeValue(AttributeValue value) {
        if (value.s() != null) {
            return new EncodedAttributeValue("S", value.s(), null, null);
        }
        if (value.n() != null) {
            return new EncodedAttributeValue("N", value.n(), null, null);
        }
        if (value.bool() != null) {
            return new EncodedAttributeValue("BOOL", null, null, value.bool());
        }
        if (Boolean.TRUE.equals(value.nul())) {
            return new EncodedAttributeValue("NULL", null, null, null);
        }
        if (value.b() != null) {
            return new EncodedAttributeValue("B",
                    Base64.getEncoder().encodeToString(value.b().asByteArray()), null, null);
        }
        if (value.hasSs()) {
            return new EncodedAttributeValue("SS", null, List.copyOf(value.ss()), null);
        }
        if (value.hasNs()) {
            return new EncodedAttributeValue("NS", null, List.copyOf(value.ns()), null);
        }
        if (value.hasBs()) {
            return new EncodedAttributeValue("BS", null,
                    value.bs().stream()
                            .map(bytes -> Base64.getEncoder().encodeToString(bytes.asByteArray()))
                            .collect(Collectors.toList()),
                    null);
        }
        throw new IllegalArgumentException("Unsupported pagination key attribute value");
    }

    /**
     * Rebuilds a DynamoDB {@link AttributeValue} from its encoded token representation.
     *
     * @param value     encoded attribute from the token payload
     * @param nextToken original opaque token string used in validation errors
     * @return decoded attribute value
     * @throws InvalidPaginationTokenException when the encoded shape is invalid
     */
    private static AttributeValue decodeAttributeValue(EncodedAttributeValue value, String nextToken) {
        if (value == null || value.type() == null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        return switch (value.type()) {
            case "S" -> AttributeValue.builder().s(requireScalar(value, nextToken)).build();
            case "N" -> AttributeValue.builder().n(requireScalar(value, nextToken)).build();
            case "BOOL" -> AttributeValue.builder().bool(requireBoolean(value, nextToken)).build();
            case "NULL" -> AttributeValue.builder().nul(true).build();
            case "B" -> AttributeValue.builder()
                    .b(SdkBytes.fromByteArray(Base64.getDecoder().decode(requireScalar(value, nextToken))))
                    .build();
            case "SS" -> AttributeValue.builder().ss(requireValues(value, nextToken)).build();
            case "NS" -> AttributeValue.builder().ns(requireValues(value, nextToken)).build();
            case "BS" -> AttributeValue.builder()
                    .bs(requireValues(value, nextToken).stream()
                            .map(encoded -> SdkBytes.fromByteArray(Base64.getDecoder().decode(encoded)))
                            .toList())
                    .build();
            default -> throw new InvalidPaginationTokenException(nextToken);
        };
    }

    /** Returns whether an attribute value contains one supported DynamoDB value representation. */
    private static boolean hasValue(AttributeValue value) {
        return value.s() != null || value.n() != null || value.bool() != null || Boolean.TRUE.equals(value.nul())
                || value.b() != null || value.hasSs() || value.hasNs() || value.hasBs();
    }

    /**
     * Returns the scalar string payload for string, number, or binary encoded values.
     *
     * @param value     encoded attribute from the token payload
     * @param nextToken original opaque token string used in validation errors
     * @return non-null scalar value
     * @throws InvalidPaginationTokenException when the scalar payload is absent
     */
    private static String requireScalar(EncodedAttributeValue value, String nextToken) {
        if (value.value() == null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        return value.value();
    }

    /**
     * Returns the boolean payload for {@code BOOL} encoded values.
     *
     * @param value     encoded attribute from the token payload
     * @param nextToken original opaque token string used in validation errors
     * @return non-null boolean value
     * @throws InvalidPaginationTokenException when the boolean payload is absent
     */
    private static Boolean requireBoolean(EncodedAttributeValue value, String nextToken) {
        if (value.bool() == null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        return value.bool();
    }

    /**
     * Returns the string list payload for set-typed encoded values.
     *
     * @param value     encoded attribute from the token payload
     * @param nextToken original opaque token string used in validation errors
     * @return non-null list of encoded set members
     * @throws InvalidPaginationTokenException when the list payload is absent
     */
    private static List<String> requireValues(EncodedAttributeValue value, String nextToken) {
        if (value.values() == null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        return value.values();
    }

    /**
     * JSON-friendly representation of one DynamoDB attribute value inside a pagination token.
     *
     * @param type   DynamoDB type discriminator such as {@code S} or {@code N}
     * @param value  scalar payload for string, number, or base64 binary values
     * @param values list payload for string, number, or binary sets
     * @param bool   boolean payload for {@code BOOL} values
     */
    private record EncodedAttributeValue(String type, String value, List<String> values, Boolean bool) {
    }
}
