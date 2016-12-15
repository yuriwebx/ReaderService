"use strict";
/*

 */

const _ = require('underscore');



module.exports = {
    _diffApply  : diffApply,
    apply       : diffApply,

    diff        : _diff,
    joinPatches : diffApply, //concat two or more patches into one
    //
    _getDocs    : _getDocs,

    // resolve array conflicts
    resolve : {
        error : conflictResolveError,
        concat : conflictResolveConcat,
        unique : conflictResolveUnique,
        original : conflictResolveOriginal,
        patch : conflictResolvePatch,
        deepUnique : conflictResolveDeepUnique
    }
};
////////////////////////////////



/*jshint -W098 */
/**
 * @param {*} originalValue
 * @param {*} patchValue
 * @param {String} path
 */
function conflictResolveError(originalValue, patchValue, path){
    throw error(500, 'conflict', 'Cannot resolve automatically: ' + path);
}

function conflictResolveConcat(originalValue, patchValue/*, path*/){
    return (originalValue || []).concat(patchValue || []);
}

function conflictResolveOriginal(originalValue/*, patchValue, path*/){
    return originalValue;
}

function conflictResolvePatch(originalValue, patchValue/*, path*/){ // jshint ignore:line
    return patchValue;
}

function conflictResolveUnique(originalValue, patchValue/*, path*/){
    return Array.from( new Set( (originalValue || []).concat(patchValue || []) ));
    // return new MySet( (originalValue || []).concat(patchValue || []) ).toArray();    // for web browser
}

// like unique, but make deep comparison
function conflictResolveDeepUnique(originalValue, patchValue, path){
    let originalJsonArray = (originalValue || []).map(JSON.stringify);
    let patchJsonArray = (patchValue || []).map(JSON.stringify);
    let result = [];

    let oi = originalJsonArray.length - 1;
    let pi = patchJsonArray.length - 1;
    while(oi >= 0 || pi >= 0){
        let oval = oi >= 0 ? originalJsonArray[oi] : null;
        let pval = pi >= 0 ? patchJsonArray[pi] : null;

        if( oval === pval){
            result.unshift(oval);
            oi--;
            pi--;
        }
        else{
            if( pval !== null && originalJsonArray.indexOf(pval) < 0 ){
                result.unshift(pval);
                pi--;
            }
            if( oval !== null && patchJsonArray.indexOf(oval) < 0 ){
                result.unshift(oval);
                oi--;
            }
        }
    }
    return result.map(JSON.parse);
}
/*jshint +W098 */



/**
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @returns {Object}
 * @private
 */
function _diff(newDoc, oldDoc) {
    // TODO: _diff: this is very simple diff logic
    var result = {};
    newDoc = newDoc || {};
    oldDoc = oldDoc || {};
    for (var name in newDoc) {
        if (newDoc.hasOwnProperty(name)) {
            if (newDoc[name] !== oldDoc[name] || typeof oldDoc[name] === "undefined") {
                if (Array.isArray(newDoc[name]) || Array.isArray(oldDoc[name])) {
                    // array diff
                    var a = oldDoc[name] || [];
                    var b = newDoc[name] || [];
                    // TODO: intersection: compare objects
                    if (a.length !== b.length || _.intersection(a, b).length !== a.length) {
                        result[name] = newDoc[name];
                    }
                }
                else if (typeof newDoc[name] === "object" || typeof oldDoc[name] === "object") {
                    var diff = _diff(newDoc[name], oldDoc[name]);
                    if (Object.keys(diff).length > 0) {
                        result[name] = diff;
                    }
                }
                else {
                    result[name] = newDoc[name];
                }
            }
        }
    }
    return result;
}






/**
 * conflictResolveFn - function, which will be called when conflict occurred
 */
function diffApply(diff, obj, conflictResolveFn){
    return deepExtend(obj , diff, conflictResolveFn);
}
function deepExtend(obj , diff, conflictResolveFn) {
    conflictResolveFn = conflictResolveFn || conflictResolvePatch;
    return _deepExtend(obj || {}, diff || {}, conflictResolveFn, '');
}

function _deepExtend(obj , diff, conflictResolveFn, _pathPrefix) {
    var result = _.clone(obj); // plain clone.  Any nested objects or arrays will be copied by reference, not duplicated.
    var xpath;
    Object.keys(diff).forEach(function(key) {
        if (!diff.hasOwnProperty(key)) {
            return;
        }

        if( Array.isArray(diff[key]) && Array.isArray(obj[key]) ){
            xpath = _pathPrefix + '.' + key;
            result[key] = conflictResolveFn(obj[key], diff[key], xpath.substr(1) );
        }
        else if( Array.isArray(diff[key]) ) {
            result[key] = diff[key];
        }
        else if( Array.isArray(obj[key]) ) {
            result[key] = obj[key];
        }
        else if( isObject(diff[key]) ) {
            // Array is Object too !!!
            xpath = _pathPrefix + '.' + key;
            result[key] = _deepExtend(obj[key] || {}, diff[key], conflictResolveFn, xpath);
        }
        else if (typeof diff[key] !== "undefined") {
            result[key] = diff[key];
        }
    });
    return result;
}








/**
 * get unmerged docs from dbs
 * @return {array}
 */
function _getDocs(id, nanoDbs) {
    return Promise.all(
        nanoDbs.map(function(db){
            return db.get(id).catch(function(){return null;});
        })
    ).then(function(data) {
        for(var i = data.length - 1; i >= 0; i--){
            if(data[i]){
                return data;
            }
        }
        throw notFound(id);
    });
}


/**
 * @param {int} code
 * @param {String} name
 * @param {String} message
 * @returns {Error}
 */
function error(code, name, message){
    var e = new Error(message || 'unknown');
    e.error = true;
    // e.message = message;
    e.name = name || "error";
    e.reason = e.message;
    e.status = code || 500;

    return e;
}
//
function notFound(target){
    return error(404, "not_found", "missing " + (target||''));
}


/**
 *
 * @param {*} value
 * @returns {boolean}
 */
function isObject(value) {
    return _.isObject(value);
    // alternative:
    // return !!(value && Object.prototype.toString.call(value) === '[object Object]');
}
