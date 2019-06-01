/**
 * Demonstrates a simple HTTP endpoint using API Gateway.                  
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const getRange = (rangeMin, rangeMax, targetMin, targetMax, value) => {
        return (((value - rangeMin) / (rangeMax - rangeMin)) * (targetMax - targetMin)) + targetMin;
    }

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const getScoreLongLat = (longCoord, latCoord, maxDist) => {
        const longLatString = longCoord + ' ' + latCoord;
        const maxDistance = maxDist || '800';
        const postgresConfig = require('./keys/postgres');
        const Pool = require('pg').Pool
        const pool = new Pool({
          user: postgresConfig.user,
          host: postgresConfig.host,
          database: postgresConfig.database,
          password: postgresConfig.password,
          port: postgresConfig.port
        });
        // I couldnt figure out how to get parameterization to work here, it wants strings not numbers? 
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
                if (error) {
                    return {
                        statusCode: 500,
                        body: JSON.stringify(error)
                    };
                } else {
                    let popularitySum = 0;
                    response.rows.forEach(row => {
                        const activityScaled = utils.getRange(row.mincnt, row.maxcnt, 0, 100, row.activitycount);
                        const distanceScaled = utils.getRange(0, maxDistance, 1, 0, row.distance);
                        popularitySum += activityScaled * distanceScaled;
                        //console.log(row.name, row.distance, row.activitycount, (activityScaled * distanceScaled));
                    });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({score: popularitySum})
                    };
                }
            });
    }

    switch (event.httpMethod) {
        case 'GET':
            
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};



const 

/*
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
        // I couldnt figure out how to get parameterization to work here, it wants strings not numbers? 
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
                if (error) {
                    res.status(500).send(error);
                } else {
                    let popularitySum = 0;
                    response.rows.forEach(row => {
                        const activityScaled = utils.getRange(row.mincnt, row.maxcnt, 0, 100, row.activitycount);
                        const distanceScaled = utils.getRange(0, maxDistance, 1, 0, row.distance);
                        popularitySum += activityScaled * distanceScaled;
                        //console.log(row.name, row.distance, row.activitycount, (activityScaled * distanceScaled));
                    });
                    res.status(200).send({score: popularitySum});
                }
            });
    } else {
        res.status(500).send("Must define long and lat"); 
    }
})

*/