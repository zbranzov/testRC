const https = require('https');
const fs = require('fs');
const child_process = require("child_process");
const parseArgs = require('minimist');
const rimraf = require('rimraf');

const possibleFiles = ["AndroidManifest.xml", "java", "jniLibs", "res", "assets"];
const tns = "../node_modules/.bin/tns";

const getPlugins = new Promise(
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

const testPlugins = function () {
    getPlugins
        .then(function (plugins) {
            const argv = parseArgs(process.argv, opts = {})
            const fromIndex = argv.from || 0;
            const toIndex = argv.to > plugins.length ? plugins.length : argv.to;
            console.log("Testing plugins from " + fromIndex + " to " + toIndex);
            for (let index = fromIndex; index < toIndex; index++) {

                let pluginName = plugins[index].name;
                installPlugin(pluginName);
                buildApp(index, pluginName);
                checkForAarFile(pluginName);
                removePlugin(pluginName);
                removePlatforms();
            }
        })
};

const findOne = function (actualFiles, searchedFiles) {
    return searchedFiles.some(function (item) {
        if (actualFiles.indexOf(item) >= 0) {
            console.log("Found " + item);
            return true;
        } else {
            return false;
        }
    });
};

const log = function (data, fileName) {
    var file = fileName || "log.txt";
    console.log(data);
    try {
        fs.appendFileSync(file, data + "\n");
    } catch (err) {
        console.log(err);
    }
};

const installPlugin = function (pluginName) {
    try {
        child_process.execSync("cd demo &&" + tns + " plugin add " + pluginName);
        console.log("\nInstalled " + pluginName);
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const buildApp = function (index, pluginName) {
    try {
        child_process.execSync("cd demo && " + tns + " build android");
        console.log("App built");
    } catch (e) {
        log(">>> Failed building " + pluginName + " at index " + index);
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const removePlugin = function (pluginName) {
    try {
        child_process.execSync("cd demo &&" + tns + " plugin remove " + pluginName);
        console.log("Removed " + pluginName);
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const checkForAarFile = function (pluginName) {
    try {
        let androidFiles = [];
        const path = "./demo/node_modules/" + pluginName + "/platforms/android";
        if (fs.existsSync(path)) {
            androidFiles = fs.readdirSync(path);
        }
        const shouldHaveAar = findOne(androidFiles, possibleFiles);
        let hasAarFile = false;
        if (shouldHaveAar) {
            const pluginAar = pluginName.replace("-", "_") + ".aar";
            hasAarFile = androidFiles.includes(pluginAar);

            if (!hasAarFile) {
                const message = ">>> " + pluginName + " has no Aar file!!!";
                log(message);
            } else {
                console.log(pluginName + " has .aar file");
            }
        }
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const removePlatforms = function () {
    try {
        rimraf.sync('demo/platforms');
        console.log("Platforms folder removed");
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

testPlugins();