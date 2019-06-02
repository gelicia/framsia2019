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
        if (longCoord !== undefined && !isNaN(longCoord) && latCoord !== undefined && !isNaN(latCoord)) {
            const longLatString = longCoord + ' ' + latCoord;
            const maxDistance = maxDist || '800';

            const postgresConfig = require('./keys/postgres');
            const Pool = require('pg').Pool;
            const pool = new Pool({
              user: postgresConfig.user,
              host: postgresConfig.host,
              database: postgresConfig.database,
              password: postgresConfig.password,
              port: postgresConfig.port,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000
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
            []).then((response) => {
                    pool.end(); // it won't return with an open connection
                    let popularitySum = 0;
                    response.rows.forEach(row => {
                        const activityScaled = getRange(row.mincnt, row.maxcnt, 0, 100, row.activitycount);
                        const distanceScaled = getRange(0, maxDistance, 1, 0, row.distance);
                        popularitySum += activityScaled * distanceScaled;
                    });
                    return done(undefined, {score: popularitySum});
            }).catch((err) => {
                return done(err);
            });
        } else {
            return done({message: "Query params long and lat (or one param, a comma delimited latlong or longlat) are required and must be numeric."});
        }
    }

    switch (event.context["http-method"]) {
        case 'GET':
            if (event.params.querystring.latlong) { // particle events need to pass in a string. parse the string
                const latLongArr = event.params.querystring.latlong.split(',');
                if (latLongArr.length === 2) {
                    getScoreLongLat(latLongArr[1], latLongArr[0], event.params.querystring.maxDist);   
                } else {
                    done({message: "Invalid latlong param."});
                }
            } else if (event.params.querystring.longlat) { // fine.
                const longLatArr = event.params.querystring.longlat.split(',');
                if (longLatArr.length === 2) {
                    getScoreLongLat(longLatArr[0], longLatArr[1], event.params.querystring.maxDist);   
                } else {
                    done({message: "Invalid longlat param."});
                }
            } else {
                getScoreLongLat(event.params.querystring.long, event.params.querystring.lat, event.params.querystring.maxDist);
            }
            
            break;
        default:
            done(event);
    }
};