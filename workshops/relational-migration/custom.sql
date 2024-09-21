SELECT cust_id as 'PK', cust_id as 'SK', name, email, phone, region, state, credit_rating, credit_rating * 2 as cd, last_updated
FROM Customers
LIMIT 3