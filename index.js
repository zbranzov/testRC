const https = require('https');
const fs = require('fs');

let getPlugins = new Promise(
    function getPlugins(resolve, reject) {

        const options = {
            hostname: 'market.nativescript.org',
            path: '/api/plugins?take=1000',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        let wholeData = "";
        https.get(options, (res) => {
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            res.on('data', (data) => {
                wholeData = wholeData.concat(data);
            });
            res.on('end', (data1) => {
                console.log('No more data in response.');
                wholeData = JSON.parse(wholeData);
                resolve(wholeData.data);
            });

        }).on('error', (e) => {
            console.error(e);
            reject(e);
        });
    });

let testPlugins = function () {
    getPlugins
        .then(function (plugins) {
            console.log(plugins[1]);
        })
}

testPlugins();