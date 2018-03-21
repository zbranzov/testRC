const https = require('https');
const fs = require('fs');
const child_process = require("child_process");
const parseArgs = require('minimist');
const rimraf = require('rimraf');
const stringTable = require('string-table');

const possibleFiles = ["AndroidManifest.xml", "java", "jniLibs", "res", "assets"];
const tns = __dirname + "/node_modules/.bin/tns";
const unremovablePlugins = ["nativescript-linearprogressbar-swift-3.2", "nativescript-socket.io"];

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
            const toIndex = argv.to > plugins.length ? plugins.length : argv.to || plugins.length;
            console.log(child_process.execSync("npm show tns-android@next version").toString());
            log("Testing plugins from " + fromIndex + " to " + toIndex);
            let failedPlugins = [];
            for (let index = fromIndex; index < toIndex; index++) {
                let pluginName = plugins[index].name;
                if (unremovablePlugins.includes(pluginName)) {
                    continue;
                }
                let plugin = new Plugin();
                plugin.name = pluginName
                // test tns build android
                installPlugin(pluginName);
                plugin.hasBuiltApp = buildApp(index, pluginName);
                plugin.hasAarOnAppBuild = checkForAarFile(pluginName);
                removePlugin(pluginName);
                // test tns plugin build
                installPlugin(pluginName);
                plugin.hasBuiltPlugin = buildPlugin(pluginName);
                plugin.hasAarOnPluginBuild = checkForAarFile(pluginName);
                removePlugin(pluginName);
                removePlatforms();
                if (!plugin.hasBuiltApp || !plugin.hasAarOnAppBuild || !plugin.hasBuiltPlugin) {
                    failedPlugins.push(plugin)
                }
            }

            console.log("\nFAILED PLUGINS \n");
            failedPlugins.sort(function (a) { return !a.hasAarOnAppBuild && a.hasBuiltApp });
            console.log(stringTable.create(failedPlugins, { headers: ['name', 'hasBuiltApp', 'hasAarOnAppBuild', 'hasBuiltPlugin', 'hasAarOnPluginBuild'], capitalizeHeaders: true }));

        })
};

const findOne = function (actualFiles, searchedFiles) {
    return searchedFiles.some(function (item) {
        if (actualFiles.indexOf(item) >= 0) {
            log("Found " + item);
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
        child_process.execSync("cd demo && " + tns + " plugin add " + pluginName);
        log("\nInstalled " + pluginName);
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const buildApp = function (index, pluginName) {
    try {
        child_process.execSync("cd demo && " + tns + " build android");
        log("# App built");
        return true;
    } catch (e) {
        log(">>> Failed building app with " + pluginName + " at index " + index);
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
        return false;
    }
};

const buildPlugin = function (pluginName) {
    try {
        child_process.execSync("cd demo/node_modules/" + pluginName + " && " + tns + " plugin build");
        log("# Plugin built");
        return true;
    } catch (e) {
        log(">>> Failed building " + pluginName);
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
        return false;
    }
};

const removePlugin = function (pluginName) {
    try {
        child_process.execSync("cd demo &&" + tns + " plugin remove " + pluginName);
        log("Removed " + pluginName);
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
            let pluginAar = pluginName.replace(/\-/g, "_") + ".aar";
            if (pluginAar.includes("/")) {
                pluginAar = pluginAar.substring(pluginAar.indexOf("/") + 1);
            }
            hasAarFile = androidFiles.includes(pluginAar);

            if (!hasAarFile) {
                const message = ">>> " + pluginName + " has no Aar file!!!";
                log(message);
                return false;
            } else {
                log(pluginName + " has .aar file");
                return true;
            }
        }
        return true;
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

const removePlatforms = function () {
    try {
        rimraf.sync('demo/platforms');
        log("Platforms folder removed");
    } catch (e) {
        const error = e.stderr ? e.stderr.toString() : e;
        log(error);
    }
};

function Plugin() {
    this.name = "";
    this.hasBuiltApp = false;
    this.hasAarOnAppBuild = false;
    this.hasBuiltPlugin = false;
    this.hasAarOnPluginBuild = false;
}

testPlugins();

