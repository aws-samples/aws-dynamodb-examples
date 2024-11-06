function getSqlSamples() {

    const sqlSamples = [
        "SELECT * FROM Customers",

        "-- Item collection\n\nSELECT *\nFROM\n   OrderLines\nWHERE\n   ord_id = '0003'",
        "-- Item collection with range expression\n\nSELECT *\nFROM\n   OrderLines\nWHERE\n   ord_id = '0003' AND ord_line_id > '0002'",
        "-- Item collection with filter condition\n\nSELECT *\nFROM\n   OrderLines\nWHERE\n   ord_id = '0003' AND item_price < '5500'",

        "",
        "-- one year future date, used by the TTL delete service\n\nSELECT\n  NOW() as 'Now',\n" +
        "  DATE_ADD(NOW(),INTERVAL 1 YEAR) as 'One Year Out',\n  UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL'",

        "-- Sparse pattern via CASE statement with NULLs\n\nSELECT\n   name as 'customer', credit_rating,\n" +
        "   CASE\n      WHEN credit_rating > 700 THEN 'GOLD'\n      WHEN credit_rating > 600 THEN 'SILVER'\n   ELSE NULL\n   END AS 'Tier'\n\nFROM Customers\nLIMIT 6",
        "-- Concatenated columns for hierarchical sort key\n\nSELECT\n   prod_id,\n   CONCAT(category, '#', name) as categoryname,\n   list_price \n\nFROM Products",
        "",

        "-- OrdersDenormalized\n--   Four Tables denormalized with JOIN\n\nSELECT\n   c.name AS Customer,                                          -- Partition (HASH) Key\n   CONCAT('ord-', o.ord_id, '#', ol.ord_line_id) AS OrderLine,  -- Sort (RANGE) Key\n\n"
           + "   p.prod_id, p.category,\n   p.name as 'product', p.list_price,\n   ol.item_price as 'sale_price', ol.qty, o.rep_id,\n   LEFT(o.ord_date, 10)  as ord_date,\n   LEFT(o.ship_date, 10) as ship_date,\n   "
           + "c.state, c.region, c.email,\n   UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL'  -- future date for auto delete\n\n"
           + "FROM\n  Orders o\n    INNER JOIN OrderLines ol ON o.ord_id   = ol.ord_id\n    INNER JOIN Customers c   ON o.cust_id  = c.cust_id\n    INNER JOIN Products p    ON ol.prod_id = p.prod_id;",


        "-- OrdersStacked\n--   Four tables stacked with UNION \n\nSELECT\n    t.*,\n    UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL' \nFROM \n   (\n" +
        "    SELECT\n      CONCAT('cs-', c.cust_id) as 'PK',  -- Partition (HASH) Key, generic name\n" +
        "      0 as 'SK',                         -- Sort (RANGE) Key, default value\n      c.name as 'Customer',\n      c.region, c.email, c.cust_id,\n      NULL as 'rep', NULL as 'ord_id',\n      NULL as 'ord_line_id', NULL as 'qty', NULL as 'sale_price',\n      NULL as 'prod_id', NULL as 'list_price', NULL as 'product'\n" +
        "    FROM Customers c\n\n    UNION ALL\n\n" +
        "    SELECT\n      CONCAT('or-', o.ord_id) as 'PK',\n      0 as 'SK',\n      NULL as 'Customer', \n      NULL as 'region', NULL as 'email', o.cust_id,\n      o.rep_id, o.ord_id,\n      NULL as 'ord_line_id', NULL as 'qty', NULL as 'sale_price', \n      NULL as 'prod_id', NULL as 'list_price', NULL as 'product'\n    FROM Orders o " +
        "\n\n    UNION ALL\n\n" +
        "    SELECT\n      CONCAT('oln-', ol.ord_id) as 'PK',\n      ord_line_id as 'SK',\n      NULL as 'Customer', \n      NULL as 'region', NULL as 'email', NULL as 'cust_id',\n      NULL as 'rep', ol.ord_id as 'ord_id',\n      ol.ord_line_id, ol.qty, ol.item_price as 'sale_price',\n      ol.prod_id as 'prod_id', NULL as 'list_price', NULL as 'product'\n    FROM OrderLines ol" +
        "\n\n      UNION ALL\n\n" +
        "    SELECT\n      CONCAT('pr-', p.prod_id) as 'PK',\n      0 as 'SK',\n      NULL as 'Customer', \n      NULL as 'region', NULL as 'email', NULL as 'cust_id',\n      NULL as 'rep', NULL as 'ord_id',\n      NULL as 'ord_line_id',\n      NULL as 'qty', NULL as 'sale_price',\n      p.prod_id, p.list_price, p.name as 'product'\n    FROM\n      Products p\n) t"

    ];
    return sqlSamples;
}