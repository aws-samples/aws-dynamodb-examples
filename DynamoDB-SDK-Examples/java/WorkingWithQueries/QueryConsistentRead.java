package com.aws.lhnng;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.Iterator;
import java.util.Map;

public class QueryConsistentRead {

    public static void main(String[] args){
        // Create Client
        DynamoDbEnhancedClient enhancedClient = DynamoDbEnhancedClient.create();

        // Map Table Using Bean
        DynamoDbTable<Customer> table = enhancedClient.table("RetailDatabase", TableSchema.fromBean(Customer.class));

        try{

            QueryConditional queryConditional = QueryConditional
                    .keyEqualTo(Key.builder()
                            .partitionValue("jim.bob@somewhere.com")
                            .build());

            // Get items in the table and write out the FirstName value with Consistent Read
            Iterator<Customer> results = table.query(r ->r.queryConditional(queryConditional).consistentRead(true)).items().iterator();
            String result="";

            while (results.hasNext()) {
                Customer rec = results.next();
                result = rec.getFirstName();
                System.out.println("The record name is :"+result);
            }


        } catch (DynamoDbException e) {
            handleCommonErrors(e);
            System.exit(1);
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


        // Static Builder Class
        public static class Builder {
            private String pk;
            private String sk;
            private String name;
            private String firstName;
            private String lastName;
            private Map<String,String> address;
            private String username;


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


            public Customer build() {
                Customer cust = new Customer();
                cust.pk = this.pk;
                cust.sk = this.sk;
                cust.name = this.name;
                cust.firstName = this.firstName;
                cust.lastName = this.lastName;
                cust.address = this.address;
                cust.username = this.username;
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
