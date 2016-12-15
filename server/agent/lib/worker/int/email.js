"use strict";
const External = require('./external');
const external = new External();

/**
 * Handle tasks by TaskHandler
 * @constructor
 */
function Email() {
    const self = this;

    self.invite = (input)=>{
        var reqParams = input.reqParams;

        var url = reqParams.url;
        var from = url.substring(url.indexOf('studyclass'), url.indexOf('?'));
        var to = 'invite';
        reqParams.url = reqParams.url.replace(from, to);

        return external.send(input);
    };
}

module.exports = Email;



