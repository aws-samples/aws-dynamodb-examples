CREATE DATABASE IF NOT EXISTS app_db;

USE app_db;

DROP TABLE IF EXISTS OrderLines;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Customers;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Reps;
-- DROP TABLE IF EXISTS CustomerLedger;

CREATE TABLE Customers (
  cust_id varchar(20) NOT NULL,
  name varchar(20) NOT NULL,
  email varchar(50) NOT NULL,
  phone varchar(30) NULL,
  region varchar(30) NOT NULL,
  credit_rating int NOT NULL,
  last_updated datetime NOT NULL,
  
  CONSTRAINT idx_cust_pk PRIMARY KEY (cust_id),

  INDEX idx_email (email),
  INDEX idx_region (region),
  INDEX idx_region_phone (region, phone),
  INDEX idx_region_credit_rating (region, credit_rating)
);

CREATE TABLE Products (
  prod_id varchar(20) NOT NULL,
  name varchar(20) NOT NULL,
  category varchar(20) NOT NULL,
  list_price int NOT NULL,
  last_updated datetime NOT NULL,
  
  CONSTRAINT idx_prod_pk PRIMARY KEY (prod_id),

  INDEX idx_category (category, last_updated)
);

CREATE TABLE Reps (
    rep_id VARCHAR(20) NOT NULL,
    rep_name VARCHAR(20) NOT NULL,
	last_updated DATETIME NOT NULL,
    CONSTRAINT idx_rep_pk PRIMARY KEY (rep_id)
);


CREATE TABLE Orders (
  ord_id varchar(20) NOT NULL,
  cust_id varchar(20) NOT NULL,
  rep varchar(20) NULL,
  ord_date datetime NOT NULL,
  ship_date datetime NOT NULL,
  last_updated datetime NOT NULL,

  INDEX idx_rep (rep),

  CONSTRAINT idx_ord_pk PRIMARY KEY (ord_id),

  CONSTRAINT cust_FK FOREIGN KEY (cust_id) REFERENCES Customers(cust_id),
  CONSTRAINT rep_FK FOREIGN KEY (rep) REFERENCES Reps(rep_id)

);

CREATE TABLE OrderLines (
    ord_id VARCHAR(20) NOT NULL,
    ord_line_id VARCHAR(20) NOT NULL,
    prod_id VARCHAR(20) NOT NULL,
    qty INT NOT NULL,
    item_price INT NOT NULL,
    last_updated DATETIME NOT NULL,
    
    CONSTRAINT idx_ord_line_pk PRIMARY KEY (ord_id , ord_line_id),

    CONSTRAINT ord_FK FOREIGN KEY (ord_id) REFERENCES Orders (ord_id),
    CONSTRAINT prod_FK FOREIGN KEY (prod_id) REFERENCES Products (prod_id)
);



-- CREATE TABLE CustomerLedger (
--   cust_id varchar(20) NOT NULL,
--   event_id varchar(20) NOT NULL,
--   event_date datetime NOT NULL,
--   event_source varchar(20) NOT NULL,
--   credit INT(10) NOT NULL,
--   INDEX idx_ledger_event_source (event_source),
--
--   CONSTRAINT idx_cust_ledger_pk PRIMARY KEY (cust_id, event_id),
--
--   CONSTRAINT cust_ledger_FK FOREIGN KEY (cust_id) REFERENCES Customers(cust_id)
-- );

SELECT 'created database and tables' as '';
