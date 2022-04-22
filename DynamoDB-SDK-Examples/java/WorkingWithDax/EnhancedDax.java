import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.extensions.annotations.DynamoDbVersionAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.InternalServerErrorException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.RequestLimitExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.dax.ClusterDaxClient;
import software.amazon.dax.Configuration;


public class EnhancedDax {

    public static void main(String[] args) throws Exception {

        Customer customer = new Customer();
        Region region = Region.EU_WEST_1;
        DynamoDbClient dax = ClusterDaxClient.builder()
                .overrideConfiguration(Configuration.builder()
                        .url("daxs://mycluster.lbbth4.dax-clusters.eu-west-1.amazonaws.com")
                        .region(region)
                        .build())
                .build();

        DynamoDbEnhancedClient enhancedClient = DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dax)
                .build();

        DynamoDbTable<Customer> table = enhancedClient.table("mytable", TableSchema.fromBean(Customer.class));

        Key key = Key.builder()
                .partitionValue("mycustomerpk")
                .sortValue("mycustomersk")
                .build();

        // Make 1000 requests, first request should hit DynamoDB
        // Subsequent requests should be served by DAX
        for(int i = 0; i< 1000; i++){
            customer = table.getItem(r->r.key(key));
            System.out.println(customer.getPk());
        }
    }

    @DynamoDbBean
    public static class Customer {

        private String pk;
        private String sk;
        private String name;
        private Integer vrsn;

        public Customer() { }

        // Partition Keys
        @DynamoDbPartitionKey
        public String getPk() {
            return pk;
        }

        public void setPk(String pk) {
            this.pk = pk;
        }

        @DynamoDbSortKey
        public String getSk() {
            return sk;
        }

        public void setSk(String sk) {
            this.sk = sk;
        }

        // Attributes
        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        @DynamoDbVersionAttribute
        public Integer getVrsn() {
            return vrsn;
        }

        public void setVrsn(Integer vrsn) {
            this.vrsn = vrsn;
        }



    }

    // Exception Helper Method
    private static void handleCommonErrors(Exception exception) {
        try {
            throw exception;
        } catch (InternalServerErrorException isee) {
            System.out.println("Internal Server Error, generally safe to retry with exponential back-off. Error: " + isee.getMessage());
        } catch (RequestLimitExceededException rlee) {
            System.out.println("Throughput exceeds the current throughput limit for your account, increase account level throughput before " +
                    "retrying. Error: " + rlee.getMessage());
        } catch (ProvisionedThroughputExceededException ptee) {
            System.out.println("Request rate is too high. If you're using a custom retry strategy make sure to retry with exponential back-off. " +
                    "Otherwise consider reducing frequency of requests or increasing provisioned capacity for your table or secondary index. Error: " +
                    ptee.getMessage());
        } catch (ResourceNotFoundException rnfe) {
            System.out.println("One of the tables was not found, verify table exists before retrying. Error: " + rnfe.getMessage());
        } catch (Exception e) {
            System.out.println("An exception occurred, investigate and configure retry strategy. Error: " + e.getMessage());
        }
    }

}

