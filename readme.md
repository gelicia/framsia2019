CREATE DATABASE framsiadb;
...connect to it...
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
CREATE EXTENSION postgis_tiger_geocoder;

CREATE TABLE stations(
    id SERIAL PRIMARY KEY,
    dataId integer NOT NULL,
    name text NOT NULL,
    lat float8 NOT NULL,
    long float8 NOT NULL,
    geom geometry(Point, 4326)
);