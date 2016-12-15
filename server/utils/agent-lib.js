/*jshint strict: false */
// var url = require('url');
var q = require('q');
// var request = require('request');
// var agent_cfg = require('../utils/configReader.js').agent;

var dbNamePrefix = require('../rest/dao/utils.js').dbNamePrefix;


// var loggerModule = require('../utils/logger.js');
// var logger = loggerModule.getLogger('agent-lib');


// //
// function normalizeUrl( /* baseUrl , ...args */ ) {
//     var args = Array.prototype.slice.call(arguments);
//     var base = args.shift();
//     var rest = args.join('/');
//     return url.resolve(base, rest);

// }


// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

//
function _generatePassword() {
    return guid();
}


// add all necessary data for establishing sync process
function persistSyncData(user) {
    var userId = user.userId || user.id || user._id;
    // _update is an internal field, which determine whether new data must me updated or not
    var update = !user.sync || user.sync.prefix !== dbNamePrefix;


    user.sync = {
        user: (user.sync && user.sync.user) || userId,
        pass: (user.sync && user.sync.pass) || _generatePassword(),
        prefix: dbNamePrefix,
        _update: update
    };

    return q.resolve(user);
}

function cleanUpTempData(user) {
    if(user && user.sync) {
        delete user.sync._update;
    }

    return user;
}

///////////////////////////////////////
module.exports = {
    persistSyncData: persistSyncData,
    cleanup: cleanUpTempData
};
