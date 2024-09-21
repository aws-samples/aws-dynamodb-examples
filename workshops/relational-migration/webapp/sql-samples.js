function getSqlSamples() {

    const sqlSamples = [
        "SELECT * FROM Customers",
        "SELECT * FROM Products",
        "SELECT * FROM Orders",
        "SELECT * FROM OrderLines",
        "",
        // "-- Projects specific columns\n\nSELECT\n   ord_id,\n   qty,\n   item_price\n\nFROM OrderLines\nLIMIT 3",
        // "-- Renames columns\n\nSELECT\n   ord_id     AS 'Order',\n   qty        AS 'Quantity',\n   item_price AS 'Price'\n\nFROM OrderLines\nLIMIT 3",
        // "-- Duplicates columns\n\nSELECT\n   ord_id     AS 'Order',\n   qty        AS 'Quantity',\n   item_price AS 'Price',\n   item_price AS 'ListPrice'\n\nFROM OrderLines\nLIMIT 3",
        // "-- Creates new columns\n\nSELECT\n  'JOB3' AS 'Job',\n   'PAT' AS 'RunBy',\n   NOW() AS 'Date',\n  ord_id, qty, item_price\n\nFROM OrderLines\nLIMIT 3",

        // "-- Concatenates columns\n\nSELECT\n   prod_id,\n   CONCAT(category, '#', name) as 'Product',\n\n   CONCAT(name, '#', last_updated) as 'ProductDate'\n\nFROM Products\nLIMIT 10",

        "-- Item collection\n\nSELECT *\nFROM\n   OrderLines\nWHERE\n   ord_id = '0003'",
        "-- Item collection with range expression\n\nSELECT *\nFROM\n   OrderLines\nWHERE\n   ord_id = '0003' AND ord_line_id > '0002'",
        "",
        "-- one year future date, used by the TTL delete service\n\nSELECT\n  NOW() as 'Now',\n" +
        "  DATE_ADD(NOW(),INTERVAL 1 YEAR) as 'One Year Out',\n  UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL'",

        "-- CASE statement with NULLs\n\nSELECT\n   name, credit_rating,\n" +
        "   CASE\n      WHEN credit_rating > 700 THEN 'GOLD'\n      WHEN credit_rating > 600 THEN 'SILVER'\n   ELSE NULL\n   END AS 'Tier'\n\nFROM Customers\nLIMIT 6",
        "",
        "-- Concatenated columns for hierarchical sort key\nSELECT\n   prod_id, CONCAT(category, '#', name) as categoryname, list_price \nFROM Products",
        "",

        "-- Two tables denormalized with JOIN\nSELECT\n   p.prod_id     AS 'p.prod_id',\n   p.name        AS 'p.name',\n   ol.qty        AS 'ol.qty',\n   ol.item_price AS 'ol.item_price'\n\nFROM OrderLines ol\n  INNER JOIN Products p\n    ON ol.prod_id = p.prod_id ",
        "-- Four tables denormalized with JOIN\nSELECT\n   c.name         AS 'c.name',\n   c.region       AS 'c.region',\n   c.email        AS 'c.email',\n\n   o.ord_id       AS 'o.ord_id',\n   o.rep          AS 'o.rep',\n\n   ol.ord_line_id AS 'ol.ord_line_id',\n   ol.qty         AS 'ol.qty',\n   ol.item_price  AS 'ol.item_price',\n\n   p.prod_id      AS 'p.prod_id',\n   p.name         AS 'p.name'\n\n" +
        "FROM OrderLines ol\n\n INNER JOIN Products p\n    ON ol.prod_id = p.prod_id\n\n " +
        "INNER JOIN Orders o\n    ON o.ord_id = ol.ord_id\n\n  " +
        "INNER JOIN Customers c\n    ON c.cust_id = o.cust_id",

        "-- Four tables stacked with UNION ALL\nSELECT\n   c.name as 'Customer Name', c.region, c.email, c.cust_id,\n   NULL as 'rep', NULL as 'ord_id',\n   NULL as 'ord_line_id', NULL as 'qty', NULL as 'item_price',\n   NULL as 'prod_id', NULL as 'Product'\n" +
        "FROM Customers c\n\nUNION ALL\n\n" +
        "SELECT\n   NULL as 'Customer Name', NULL as 'region', NULL as 'email', o.cust_id,\n   o.rep, o.ord_id,\n   NULL as 'ord_line_id', NULL as 'qty', NULL as 'item_price', \n   NULL as 'prod_id', NULL as 'Product'\nFROM Orders o " +
        "\n\nUNION ALL\n\n" +
        "SELECT\n   NULL as 'Customer Name', NULL as 'region', NULL as 'email', NULL as 'cust_id',\n   NULL as 'rep', ol.ord_id as 'ord_id',\n   ol.ord_line_id, ol.qty, ol.item_price,\n   ol.prod_id as 'prod_id', NULL as 'Product'\nFROM OrderLines ol" +
        "\n\nUNION ALL\n\n" +
        "SELECT\n   NULL as 'Customer Name', NULL as 'region', NULL as 'email', NULL as 'cust_id',\n   NULL as 'rep', NULL as 'ord_id',\n   NULL as 'ord_line_id',\n   NULL as 'qty', NULL as 'item_price',\n   p.prod_id, p.name as 'Product'\nFROM Products p",

        "-- Wrap query in a (subquery) and add TTL \nSELECT\n    t.*,\n    UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL' \nFROM \n   (\n      SELECT\n      CONCAT('c-', c.cust_id) as 'PK', 0 as 'SK', c.name as 'Customer Name',\n      c.region, c.email, c.cust_id,\n      NULL as 'rep', NULL as 'ord_id',\n      NULL as 'ord_line_id', NULL as 'qty', NULL as 'item_price',\n      NULL as 'prod_id', NULL as 'Product'\n" +
        "      FROM Customers c\n\n      UNION ALL\n\n" +
        "      SELECT\n      CONCAT('o-', o.ord_id) as 'PK', 0 as 'SK', NULL as 'Customer Name', \n      NULL as 'region', NULL as 'email', o.cust_id,\n      o.rep, o.ord_id,\n      NULL as 'ord_line_id', NULL as 'qty', NULL as 'item_price', \n      NULL as 'prod_id', NULL as 'Product'\n      FROM Orders o " +
        "\n\n      UNION ALL\n\n" +
        "      SELECT\n      CONCAT('l-', ol.ord_id) as 'PK', ord_line_id as 'SK', NULL as 'Customer Name', \n      NULL as 'region', NULL as 'email', NULL as 'cust_id',\n      NULL as 'rep', ol.ord_id as 'ord_id',\n      ol.ord_line_id, ol.qty, ol.item_price,\n      ol.prod_id as 'prod_id', NULL as 'Product'\n      FROM OrderLines ol" +
        "\n\n      UNION ALL\n\n" +
        "      SELECT\n      CONCAT('p-', p.prod_id) as 'PK', 0 as 'SK', NULL as 'Customer Name', \n      NULL as 'region', NULL as 'email', NULL as 'cust_id',\n      NULL as 'rep', NULL as 'ord_id',\n      NULL as 'ord_line_id',\n      NULL as 'qty', NULL as 'item_price',\n      p.prod_id, p.name as 'Product'\n      FROM\n      Products p\n) t"



    ];
    return sqlSamples;
}