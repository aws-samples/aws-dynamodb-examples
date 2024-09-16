mysql -h ${MYSQL_HOST} -u ${MYSQL_USERNAME} -p${MYSQL_PASSWORD} < ./source-tables/create_tables.sql
cd load
python3 load.py Products.py
python3 load.py Customers.py
python3 load.py Reps.py
python3 load.py Orders.py
python3 load.py OrderLines.py
cd ..
