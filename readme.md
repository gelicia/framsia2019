# Framsia 2019 - Oslo City Bike Project

This contains the code used for a presentation given to the Framsia Usergroup in June 2019.

It is not meant to be a comprehensive walk-through on how to set something up, but hopefully there is enough here to help you get started!

It contains code to upload data from CSV files provided by [Oslo City Bike](https://oslobysykkel.no/en/open-data) to a Postgres database and then query it from an API from an express server (for local development) and from a lambda (for hosted).

## Database
The following will set up your schema. I ran this locally for local development, and then on Amazon RDS when hosted.

```sql
CREATE DATABASE framsiadb;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
CREATE EXTENSION postgis_tiger_geocoder;

CREATE ROLE framsiadbuser WITH LOGIN PASSWORD ''
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
``` 

The following is a the query that runs and returns the popularity score for a coordinate

```sql
SELECT stationLimit.id, distance, COUNT(*)
FROM (SELECT stations.id, stations.dataid, stations.name, stations.description, stations.long, stations.lat,
ST_Distance(stations.geom, 'SRID=4326;POINT(10.7673282 59.9031036)'::geometry, true) as distance
FROM
  stations
ORDER BY ST_Distance(stations.geom, 'SRID=4326;POINT(10.7673282 59.9031036)'::geometry, true) ASC
LIMIT 5 ) as stationLimit,
station_activity sa
WHERE sa.stationId = stationLimit.id
GROUP BY stationLimit.id, distance
```

## Server / Data Upload / Local Development
You will need to copy `server/src/keys/postgresTEMP.js`, remove TEMP, then provide your postgres server credentials in `server/src/keys/postgres.js`. 

Get the CSV file from [Oslo City Bike](https://oslobysykkel.no/en/open-data) and put it in `server/src/exampleData/csv/`. Edit `server/src/dataUtils/updateData.js` to point to the file and run it with `npm run updateData` (from the `server` directory). Doing this locally takes much less time than doing it on Amazon.

`npm run dev` runs the server.

`localhost:3000/getScoreLongLat?long=10.7268254&lat=59.9099435` will hit the API. The lambda got a bit more fancy (with other API endpoints, and latLong and longLat), but you can really see what's going on better here.

## Lambda
Run `npm i`, copy `lambda/keys/postgresTEMP.js`, remove TEMP, then provide your postgres server credentials in `lambda/keys/postgres.js`.  Zip up the lambda folder and upload to AWS Lambda.

## API Gateway
Create two GETs of `/getScoreLatLong` and `/getScoreLongLat` and have it execute the lambda.

You will need a special template for the integration response. This is so we can minimize what's returned and make it easier to parse in the microcontroller code.

```
##  String equality doesnt seem to work, but contains does. I wish this was better documented.
#set($statusCode = $input.json('$.statusCode').toString())
#if ($statusCode.contains("200"))
	$util.parseJson($input.json('$.body'))
#else
	$input.json('$')
#end
```

## Hardware
Parts include a 24 LED Neopixel ring, a GPS breakout board, a Particle Photon and an external antenna. And Tupperware, because being an adult means I can destroy Tupperware without getting in trouble. It's powered with an Anker Powercore 5000.


From [Particle's Web IDE](https://build.particle.io), create a new project, add the neopixel and Adafruit_GPS libraries, and use the code found in `hardware/framsiabike.ino`. 

From the [Particle Console](https://console.particle.io), add a new webhook integration, and have it call a GET from the deployed API endpoint. Under advanced settings, choose "Custom" for query parameters, and have it be 

```
"latlong": "{{{PARTICLE_EVENT_VALUE}}}"
```

The response happens automatically and is handled by the hardware code. 

This hardware code also contains the `setMode` function you can call from the console, for toggling modes independently of the webhook.