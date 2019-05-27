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
    geom geometry(Point, 4326),
    activitycount integer
);

CREATE TABLE station_activity(
    id SERIAL PRIMARY KEY,
    stationId integer NOT NULL,
    time timestamptz NOT NULL,
    FOREIGN KEY (stationId) REFERENCES stations (id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO framsiadbuser;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO framsiadbuser;

SELECT stationLimit.id, distance, COUNT(*)
FROM (SELECT stations.id, stations.dataid, stations.name, stations.description, stations.long, stations.lat,
ST_Distance(stations.geom, 'SRID=4326;POINT(10.7673282 59.9031036)'::geometry) as distance
FROM
  stations
ORDER BY ST_Distance(stations.geom, 'SRID=4326;POINT(10.7673282 59.9031036)'::geometry) ASC
LIMIT 5 ) as stationLimit,
station_activity sa
WHERE sa.stationId = stationLimit.id
GROUP BY stationLimit.id, distance
