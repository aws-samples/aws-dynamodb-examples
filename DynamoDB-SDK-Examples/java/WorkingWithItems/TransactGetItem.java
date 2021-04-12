package com.aws.lhnng;

import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
import software.amazon.awssdk.enhanced.dynamodb.model.*;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;
import java.util.Map;

public class TransactGetItem {

    public static void main(String[] args){

        try{

            // Create Client
            DynamoDbEnhancedClient enhancedClient = DynamoDbEnhancedClient.create();

            // Map Tables Using Bean
            DynamoDbTable<Customer> customerTable = enhancedClient.table("RetailDatabase", TableSchema.fromBean(Customer.class));
            DynamoDbTable<Product> productTable = enhancedClient.table("Product", TableSchema.fromBean(Product.class));

            // Key for Product Item
            Key prodKey = Key.builder()
                    .partitionValue("B07J1337PJ42")
                    .build();
            // Key for Customer Item
            Key custKey = Key.builder()
                    .partitionValue("vikram.johnson@somewhere.com")
                    .sortValue("metadata")
                    .build();

            TransactGetItemsEnhancedRequest transactGetItemsEnhancedRequest = TransactGetItemsEnhancedRequest.builder()
                    .addGetItem(productTable, prodKey)
                    .addGetItem(customerTable, custKey)
                    .build();

            /*
            TransactGetItems
            This uses the Enhanced Client and not the Mapped Table Resource
            */

            List<Document> response = enhancedClient.transactGetItems(transactGetItemsEnhancedRequest);
            System.out.println(response.get(0).getItem(productTable).getId());
            System.out.println(response.get(1).getItem(customerTable).getPk());

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

    @DynamoDbBean
    public static class Product {

        private String id;
        private String productStatus;

        public Product() { }

        // Partition Keys
        @DynamoDbPartitionKey
        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        // Attributes
        public String getProductStatus() {
            return productStatus;
        }

        public void setProductStatus(String productStatus) {
            this.productStatus = productStatus;
        }


        // Static Builder Class
        public static class Builder {
            private String id;
            private String productStatus;



            public Builder(String id) {
                this.id = id;
            }

            public Builder withProductStatus(String productStatus) {
                this.productStatus = productStatus;
                return this;
            }


            public Product build() {
                Product product = new Product();
                product.id = this.id;
                product.productStatus = this.productStatus;
                return product;
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
                    "Otherwise consider reducing frequency of requests or increasing provisioned capacity for your table or secondary index. Error: " + ptee.getMessage());
        } catch (ResourceNotFoundException rnfe) {
            System.out.println("One of the tables was not found, verify table exists before retrying. Error: " + rnfe.getMessage());
        } catch (TransactionCanceledException tce) {
            System.out.println("Transaction Cancelled Error: " + tce.getMessage());
        } catch (Exception e) {
            System.out.println("An exception occurred, investigate and configure retry strategy. Error: " + e.getMessage());
        }
    }

}
