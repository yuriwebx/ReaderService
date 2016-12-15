"use strict";

/* jshint -W106 */ // remove camel case check

const fs = require('fs');
// const path = require('path');

const logger = require('./lib/util/log').getLogger(__filename);

const env = process.env.NODE_ENV === "production" ? "production" : 'development';

const _files = [
    __dirname + '/config-base.json',
    __dirname + '/config-' + env.toLowerCase() + '.json',
    __dirname + '/config.json' // = config-local.js
];

function _loadJSON(fileName) {
    if (fs.existsSync(fileName)) {
        try {
            logger.log('Loading config:', fileName);
            return JSON.parse(fs.readFileSync(fileName));
        } catch (e) {
            logger.error('  error parsing %s:', fileName, e);
        }
    }
    else {
        logger.error('File not found: %s', fileName);
    }
    return {};
}



function extend(obj /* ...sources */ ) {
    var sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach(function(source) {
        Object.keys(source).forEach(function(key) {
            if (obj.hasOwnProperty(key) && isObject(obj[key])) {
                obj[key] = extend(obj[key], source[key]);
            }
            else if (typeof source[key] !== "undefined") {
                obj[key] = source[key];
            }
        });
    });
    return obj;
}

function isObject(value) {
    return !!(value && Object.prototype.toString.call(value) === '[object Object]');
}


///
logger.log('Loading %s environment', env.toUpperCase() );

let config = extend.apply(null, _files.map(_loadJSON));

// remove trailer '/'
config.db.url = config.db.url.replace(/\/\s*$/, '');
config.task_generator.source_db_urls = config.task_generator.source_db_urls
    .map(url=>{
       return url.replace(/\/$/, '');
    });

module.exports = config;

