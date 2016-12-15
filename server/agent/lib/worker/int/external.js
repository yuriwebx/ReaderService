"use strict";
const rp = require('request-promise');
const config = require('../../../config');

/**
 * Handle tasks by TaskHandler
 * @constructor
 */
function External() {
    const self = this;

    self.send = (input)=>{
        var reqParams = input.reqParams;
        var url = reqParams.url;
        if (config.parent_app_path.from && config.parent_app_path.to) { //jshint ignore:line
            url = url.replace(config.parent_app_path.from, config.parent_app_path.to); //jshint ignore:line
        }
        var method = reqParams.method;
        delete input.reqParams;
        return rp({
            uri: url,
            method: method,
            body: input,
            json: true
        })
        .catch((e)=>{
            input.reqParams = reqParams;
            throw e;
        });
    };
}

module.exports = External;



