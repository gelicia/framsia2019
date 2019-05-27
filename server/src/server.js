var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/getScoreLongLat', (req, res, callback) => {
    if (req.query.long !== undefined && req.query.lat !== undefined) {
        const longLatString = req.query.long + ' ' + req.query.lat;
        const maxDistance = req.query.maxDist || '800';
        const postgresConfig = require('./keys/postgres');
        const Pool = require('pg').Pool
        const pool = new Pool({
          user: postgresConfig.user,
          host: postgresConfig.host,
          database: postgresConfig.database,
          password: postgresConfig.password,
          port: postgresConfig.port
        });
        // For some reason, parameterization doesn't work here
        pool.query('SELECT stationdata.dataid, stationdata.name, stationdata.activitycount, stationdata.distance, ' +
        'stationAgg.sumCnt, stationAgg.minCnt, stationAgg.maxCnt ' +
        'FROM ' +
        '(SELECT stations.dataid, stations.name, stations.activitycount, ' +
        'ST_Distance(stations.geom, \'SRID=4326;POINT(' + longLatString + ')\'::geometry, true) as distance ' +
        'FROM stations ' +
        'WHERE ST_Distance(stations.geom, \'SRID=4326;POINT(' + longLatString + ')\'::geometry, true) < '+ maxDistance + ' ' +
        'ORDER BY ST_Distance(stations.geom, \'SRID=4326;POINT(' + longLatString + ')\'::geometry, true) ASC ) stationData ' +
        'CROSS JOIN ' +
        '(SELECT SUM(activityCount) sumCnt, MIN(activityCount) minCnt, MAX(activityCount) maxCnt FROM stations) stationAgg',
            [], (error, response) => {
                console.log(error, response);
                if (error) {
                    res.status(500).send(error);
                } else {
                    res.status(200).send('done');
                }
            });
    } else {
        res.status(500).send("Must define long and lat"); 
    }
})

module.exports = app;
