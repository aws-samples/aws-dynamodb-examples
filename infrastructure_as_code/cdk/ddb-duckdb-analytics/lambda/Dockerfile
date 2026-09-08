FROM public.ecr.aws/lambda/python:3.12

RUN pip install --no-cache-dir duckdb==1.5.5

# Bake the extensions into the image so cold starts never download them.
ENV DUCKDB_EXTENSION_DIR=/opt/duckdb_extensions
RUN python -c "\
import duckdb; \
con = duckdb.connect(); \
con.execute(\"SET extension_directory='/opt/duckdb_extensions'\"); \
con.install_extension('httpfs'); \
con.install_extension('aws'); \
con.install_extension('avro'); \
con.install_extension('iceberg'); \
con.close()"

COPY handler.py ${LAMBDA_TASK_ROOT}/

CMD ["handler.handler"]
