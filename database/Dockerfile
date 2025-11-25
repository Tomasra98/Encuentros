FROM postgres:16-alpine

ENV POSTGRES_DB=encuentros_db
ENV POSTGRES_USER=encuentros_user
ENV POSTGRES_PASSWORD=encuentros_pass

COPY init-schema.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
