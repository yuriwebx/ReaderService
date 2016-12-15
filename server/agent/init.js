"use strict";
const fs = require('fs');
const path = require('path');

const appCfg = require('../utils/configReader');
const agentCfg = require('./config');
const agentConfigPath = path.resolve(__dirname, './config.json');
const clientConfigPath = path.resolve(__dirname, '../../config/agent.config.json');

function init() {
    updateProperties(agentConfigPath, setAgentProperties);
    updateProperties(clientConfigPath, setClientProperties);
}

function updateProperties(pathToConfig, setFn) {
    console.log('update', pathToConfig);
    let cfg = {};
    if(fs.existsSync(pathToConfig)) {
        cfg = require(pathToConfig);
    }
    setFn(cfg);
    writeFile(pathToConfig, cfg);
}

function writeFile(path, data) {
    fs.writeFile(path, JSON.stringify(data, null, 2), (err)=>{
        if(err) {
            throw err;
        }
        console.log('done ', path);
    });
}


function setAgentProperties(config) {
    config.db = config.db || {};
    config.db.name = {
        environment_name: appCfg.environment_name, //jshint ignore:line
        database_name: appCfg.database_name //jshint ignore:line
    };
}


function setClientProperties(config) {
    config.agent.dumpPath = agentCfg.task_generator.dump.path;  //jshint ignore:line
    config.agent.url = agentCfg.db.url.replace(/[^//]*@/, "");
}

init();

