CREATE DATABASE framsiadb;
...connect to it...
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
CREATE EXTENSION postgis_tiger_geocoder;

CREATE ROLE framsiadbuser WITH LOGIN PASSWORD 'password'
GRANT CONNECT ON DATABASE framsiadb TO framsiadbuser;
GRANT USAGE ON SCHEMA public TO framsiadbuser;

CREATE TABLE stations(
    id SERIAL PRIMARY KEY,
    dataId integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    lat float8 NOT NULL,
    long float8 NOT NULL,
    geom geometry(Point, 4326)
);

CREATE TABLE station_activity(
    id SERIAL PRIMARY KEY,
    stationId integer NOT NULL,
    time timestamptz NOT NULL,
    FOREIGN KEY (stationId) REFERENCES stations (id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO framsiadbuser;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO framsiadbuser;
