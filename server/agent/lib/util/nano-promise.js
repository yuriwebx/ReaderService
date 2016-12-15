//from https://github.com/bdchauvette/nano-blue
"use strict";
const blacklist = new Set(['use', 'scope', 'followUpdates', 'follow']);
const nano = require('nano');
const bluebird = require('bluebird');

/**
 * Promisifies the exposed functions on an object
 * Based on a similar function in `qano`
 *
 * @ref https://github.com/jclohmann/qano
 */
function deepPromisify(obj) {
    return transform(obj, function(promisifiedObj, value, key) {
        if (blacklist.has(key)) {
            promisifiedObj[key] = value;
            return;
        }

        if (typeof value === 'function') {
            promisifiedObj[key] = bluebird.promisify(value, obj);
        }
        else if (typeof value === 'object') {
            promisifiedObj[key] = deepPromisify(value);
        }
        else {
            promisifiedObj[key] = value;
        }
    });
}

function transform(object, iteratee) {
    var accumulator = object;

    for (var i in accumulator) {
        if (accumulator.hasOwnProperty(i)) {
            iteratee(accumulator, accumulator[i], i);
        }
    }
    return accumulator;
}

module.exports = function nanoblue() {
    var nanoP = deepPromisify(nano.apply(null, arguments));

    // replace nano's docModule calls with a promisified version
    if (nanoP.hasOwnProperty('use')) {
        var originalDocModule = nanoP.use;
        nanoP.use = nanoP.scope = nanoP.db.use = nanoP.db.scope = function() {
            return deepPromisify(originalDocModule.apply(null, arguments));
        };
    }

    return nanoP;
};