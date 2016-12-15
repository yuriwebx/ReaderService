"use strict";
// const logger = require('../util/log').getLogger(__filename);

module.exports = {
    ext: get('ext'),
    int: get('int')
};

function get(path) {
    let cache = {};
    return function(key) {
        if(!cache[key]) {
            try {
                const Dep = require('./' + path + '/' + key);
                cache[key] = new Dep();
            }
            catch(e) {
                // logger.warn('cannot find %s/%s', path, key);
                return null;
            }
        }
        return cache[key];
    };
}