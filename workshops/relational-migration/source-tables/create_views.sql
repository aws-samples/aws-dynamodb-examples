USE app_db;
SELECT 'creating Views' as '';
-- DROP ALL CUSTOM VIEWS on app_db
SET @views = NULL;
SELECT GROUP_CONCAT(table_schema, '.', table_name) INTO @views
FROM information_schema.views
WHERE table_schema = 'app_db'; -- Your DB name here

SET @views = IFNULL(CONCAT('DROP VIEW ', @views), 'SELECT "No VIEWs to drop" as ""');
PREPARE stmt FROM @views;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE OR REPLACE VIEW vCustOrders AS
    SELECT
      c.cust_id, o.ord_id, c.name, c.email, c.region, c.state,
       o.rep_id, o.ord_date, o.ship_date
    FROM Customers c
        JOIN Orders o on c.cust_id = o.cust_id
        JOIN Reps r on o.rep_id = r.rep_id;
    -- WHERE r.rep_id = 'BOB' and c.region in ('North', 'West') LIMIT 2;

SELECT 'created view vCustOrders' as '';

-- CREATE OR REPLACE VIEW vCust AS
--     SELECT c.cust_id, c.name, c.email, c.region, c.state
--     FROM Customers c LIMIT 2;
--
-- SELECT 'created view vCust' as '';


-- CREATE OR REPLACE VIEW vCustOrdersUnion AS
--     SELECT
--       c.cust_id, c.name, c.email, c.region, c.state,
--       o.ord_id, o.rep_id, o.ord_date, o.ship_date
--     FROM app_db.Customers c JOIN app_db.Orders o on c.cust_id = o.cust_id
--     WHERE o.rep_id = 'BOB' and c.region in ('North', 'West')
--     UNION ALL
--     SELECT
--       c.cust_id, c.name, c.email, c.region, c.state,
--       o.ord_id, o.rep_id, o.ord_date, o.ship_date
--     FROM app_db.Customers c JOIN app_db.Orders o on c.cust_id = o.cust_id
--     WHERE o.rep_id = 'PAT' and c.region in ('North', 'South');
--
-- SELECT 'created view vCustOrdersUnion' as '';


-- CREATE VIEW vOrdersDenormalized AS
--
-- SELECT
--    c.name AS Customer,                                          -- Partition (HASH) Key
--    CONCAT('ord-', o.ord_id, '#', ol.ord_line_id) AS OrderLine,  -- Sort (RANGE) Key
--
--    p.prod_id, p.category,
--    p.name as 'product', p.list_price,
--    ol.item_price as 'sale_price', ol.qty, o.rep_id,
--    LEFT(o.ord_date, 10)  as ord_date,
--    LEFT(o.ship_date, 10) as ship_date,
--    c.state, c.region, c.email,
--    UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL'  -- future date for auto delete
--
-- FROM
--   Orders o
--     INNER JOIN OrderLines ol ON o.ord_id   = ol.ord_id
--     INNER JOIN Customers c   ON o.cust_id  = c.cust_id
--     INNER JOIN Products p    ON ol.prod_id = p.prod_id;
--
-- SELECT 'created view vOrdersDenormalized' as '';
--
--
-- CREATE OR REPLACE VIEW vOrdersStacked AS
-- SELECT
--     t.*,
--     UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 YEAR)) as 'TTL'
-- FROM
--    (
--     SELECT
--       CONCAT('cs-', c.cust_id) as 'PK',  -- Partition (HASH) Key, generic name
--       0 as 'SK',                         -- Sort (RANGE) Key, default value
--       c.name as 'Customer',
--       c.region, c.email, c.cust_id,
--       NULL as 'rep_id', NULL as 'ord_id',
--       NULL as 'ord_line_id', NULL as 'qty', NULL as 'sale_price',
--       NULL as 'prod_id', NULL as 'list_price', NULL as 'product'
--     FROM Customers c
--
--     UNION ALL
--
--     SELECT
--       CONCAT('or-', o.ord_id) as 'PK',
--       0 as 'SK',
--       NULL as 'Customer',
--       NULL as 'region', NULL as 'email', o.cust_id,
--       o.rep_id, o.ord_id,
--       NULL as 'ord_line_id', NULL as 'qty', NULL as 'sale_price',
--       NULL as 'prod_id', NULL as 'list_price', NULL as 'product'
--     FROM Orders o
--
--     UNION ALL
--
--     SELECT
--       CONCAT('oln-', ol.ord_id) as 'PK',
--       ord_line_id as 'SK',
--       NULL as 'Customer',
--       NULL as 'region', NULL as 'email', NULL as 'cust_id',
--       NULL as 'rep_id', ol.ord_id as 'ord_id',
--       ol.ord_line_id, ol.qty, ol.item_price as 'sale_price',
--       ol.prod_id as 'prod_id', NULL as 'list_price', NULL as 'product'
--     FROM OrderLines ol
--
--       UNION ALL
--
--     SELECT
--       CONCAT('pr-', p.prod_id) as 'PK',
--       0 as 'SK',
--       NULL as 'Customer',
--       NULL as 'region', NULL as 'email', NULL as 'cust_id',
--       NULL as 'rep_id', NULL as 'ord_id',
--       NULL as 'ord_line_id',
--       NULL as 'qty', NULL as 'sale_price',
--       p.prod_id, p.list_price, p.name as 'product'
--     FROM
--       Products p
-- ) t;
--
-- SELECT 'created view vOrdersStacked' as '';
