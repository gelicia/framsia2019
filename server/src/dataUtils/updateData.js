const csv = require('csv-parser');  
const fs = require('fs');
const path = require('path');

const stationInfo=[];
let badStationData = false;

/*
DELETE from stations;
DELETE from station_activity;
ALTER SEQUENCE stations_id_seq RESTART WITH 1;
commit;
*/

//TODO get data from server and not file
const csvStream = fs.createReadStream(path.normalize(__dirname + '/../exampleData/csv/05.csv'));
csvStream.pipe(csv())
.on('data', (row) => {
    const rowDataStart = {
        id: row.start_station_id, 
        name: row.start_station_name,
        desc: row.start_station_description,
        lat: row.start_station_latitude,
        long: row.start_station_longitude
    };

    const rowDataEnd = {
        id: row.end_station_id, 
        name: row.end_station_name,
        desc: row.end_station_description,
        lat: row.end_station_latitude,
        long: row.end_station_longitude
    };

    if (stationInfo[rowDataStart.id] === undefined){
        stationInfo[rowDataStart.id] = rowDataStart;
    } else {
        const existData = stationInfo[rowDataStart.id]; 
        if (rowDataStart.id !== existData.id || rowDataStart.name !== existData.name || rowDataStart.desc !== existData.desc
             || rowDataStart.lat !== existData.lat || rowDataStart.long !== existData.long  ){
                console.log('bad data!', rowDataStart.id);
                badStationData = true;
             }
    }

    if (stationInfo[rowDataEnd.id] === undefined){
        stationInfo[rowDataEnd.id] = rowDataEnd;
    } else {
        const existData = stationInfo[rowDataEnd.id]; 
        if (rowDataEnd.id !== rowDataEnd.id || rowDataEnd.name !== existData.name || rowDataEnd.desc !== existData.desc
             || rowDataEnd.lat !== existData.lat || rowDataEnd.long !== existData.long  ){
                console.log('bad data!', rowDataEnd.id);
                badStationData = true;
             }
    }
})
.on('end', () => {
    console.log('Station list built. Exporting to Postgres.');
    if (!badStationData) {
        const postgresConfig = require('../keys/postgres');
        const Pool = require('pg').Pool
        const pool = new Pool({
          user: postgresConfig.user,
          host: postgresConfig.host,
          database: postgresConfig.database,
          password: postgresConfig.password,
          port: postgresConfig.port
        });

        var stationInsertPromise = new Promise((resolve, reject) => {
            stationInfo.forEach((station, idx, array) => {
                if (station.id !==null) {
                   pool.query('INSERT INTO stations (dataId, name, description, lat, long, geom)' +
                    'SELECT $1, $2, $3, $4, $5, ST_SetSRID(st_MakePoint($5, $4), 4326)' +
                    ' WHERE NOT EXISTS (SELECT dataId FROM stations WHERE dataId = $1)' +
                     'RETURNING * ;', 
                    [station.id, station.name, station.desc, station.lat, station.long], (error, response) => {
                    if (error) {
                        console.log(JSON.stringify(error));
                        throw error
                    }
                    if (idx === array.length -1) resolve();
                  }); 
                }
            });
        });

        stationInsertPromise.then(() => {
            console.log('Stations imported. Importing activity.');
            const csvStream = fs.createReadStream(path.normalize(__dirname + '/../exampleData/csv/05.csv'));
            csvStream.pipe(csv())
            .on('data', (row) => {
                pool.query('INSERT INTO station_activity (stationId, time) ' +
                'SELECT stations.id, $2 FROM stations WHERE stations.dataId = $1 RETURNING * ;',
                    [row.start_station_id, row.started_at], (error, response) => {
                    if (error) {
                        console.log(JSON.stringify(error));
                        throw error
                    }
                  }); 

                pool.query('INSERT INTO station_activity (stationId, time) ' +
                'SELECT stations.id, $2 FROM stations WHERE stations.dataId = $1 RETURNING * ;', 
                    [row.end_station_id, row.ended_at], (error, response) => {
                    if (error) {
                        console.log(JSON.stringify(error));
                        throw error
                    }
                }); 
            })
            .on('end', () => {
                console.log("Activity imported.");
            });
        });
    } else {
        console.log('bad data found, did not insert');
    }
});

csvStream.on('error', (text) => {
    console.log(text);
});