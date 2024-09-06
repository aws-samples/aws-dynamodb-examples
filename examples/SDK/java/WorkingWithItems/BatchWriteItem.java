package com.aws.lhnng;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
import software.amazon.awssdk.enhanced.dynamodb.model.BatchWriteItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.WriteBatch;
import software.amazon.awssdk.services.dynamodb.model.InternalServerErrorException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.RequestLimitExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;

import java.util.HashMap;
import java.util.Map;

public class BatchWriteItem {

    public static void main(String[] args){

        try{

            // Create Client
            DynamoDbEnhancedClient enhancedClient = DynamoDbEnhancedClient.create();

            // Map Table Using Bean
            DynamoDbTable<Customer> table = enhancedClient.table("RetailDatabase", TableSchema.fromBean(Customer.class));

            // Create Address1
            HashMap<String,String> address1 = new HashMap<>();
            address1.put("road", "89105 Bakken Rd");
            address1.put("city", "Greenbank");
            address1.put("state", "WA");
            address1.put("pcode", "98253");
            address1.put("country","USA");

            // Create Customer 1
            Customer cust1 =new Customer.Builder("vikram.johnson@somewhere.com")
                    .withSk("metadata")
                    .withUsername("vikj")
                    .withFirstName("Vikram")
                    .withLastName("Johnson")
                    .withName("Vikram Johnson")
                    .withAge(31)
                    .withAddress(address1)
                    .build();

            // Create Address2
            HashMap<String,String> address2 = new HashMap<>();
            address2.put("road", "12341 Fish Rd");
            address2.put("city", "Freeland");
            address2.put("state", "WA");
            address2.put("pcode", "98249");
            address2.put("country","USA");

            // Create Customer 2
            Customer cust2 =new Customer.Builder("jose.schneller@somewhere.com")
                    .withSk("metadata")
                    .withUsername("joses")
                    .withFirstName("Jose")
                    .withLastName("Schneller")
                    .withName("Jose Schneller")
                    .withAge(27)
                    .withAddress(address1)
                    .build();

            // Create a BatchWriteItemEnhancedRequest object
            BatchWriteItemEnhancedRequest batchWriteItemEnhancedRequest =
                    BatchWriteItemEnhancedRequest.builder()
                            .writeBatches(
                                    WriteBatch.builder(Customer.class)
                                            .mappedTableResource(table)
                                            .addPutItem(r -> r.item(cust1))
                                            .addPutItem(r -> r.item(cust2))
                                            .build())
                            .build();

            /*
            BatchWrite Items
            This uses the Enhanced Client and not the Mapped Table Resource
            */
            enhancedClient.batchWriteItem(batchWriteItemEnhancedRequest);


        }catch (Exception e){
            handleCommonErrors(e);
        }
    }


    @DynamoDbBean
    public static class Customer {

        private String pk;
        private String sk;
        private String name;
        private String firstName;
        private String lastName;
        private Map<String, String> address;
        private String username;
        private int age;


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

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public Map<String,String> getAddress() { return address; }

        public void setAddress(Map<String,String> address) {
            this.address = address;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public int getAge() {
            return age;
        }

        public void setAge(int age) {
            this.age = age;
        }


        // Static Builder Class
        public static class Builder {
            private String pk;
            private String sk;
            private String name;
            private String firstName;
            private String lastName;
            private Map<String,String> address;
            private String username;
            private int age;


            public Builder(String pk) {
                this.pk = pk;
            }

            public Builder withSk(String sk) {
                this.sk = sk;
                return this;
            }

            public Builder withName(String name) {
                this.name = name;
                return this;
            }

            public Builder withFirstName(String firstName) {
                this.firstName = firstName;
                return this;
            }

            public Builder withLastName(String lastName) {
                this.lastName = lastName;
                return this;
            }

            public Builder withAddress(Map<String,String> address){
                this.address = address;
                return this;
            }

            public Builder withUsername(String username) {
                this.username = username;
                return this;
            }

            public Builder withAge(int age) {
                this.age = age;
                return this;
            }


            public Customer build() {
                Customer cust = new Customer();
                cust.pk = this.pk;
                cust.sk = this.sk;
                cust.name = this.name;
                cust.firstName = this.firstName;
                cust.lastName = this.lastName;
                cust.address = this.address;
                cust.username = this.username;
                cust.age = this.age;
                return cust;
            }
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
