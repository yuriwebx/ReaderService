"use strict";
const assert = require('assert');
const dbNames = require('../../lib/conf/db_names');
const dbPrefix = dbNames.prefix;

describe('DB names [UNIT]', function () {

    const id = 'test-id';

    const dbKeys = ['public', 'private', 'user', 'user_rw', 'course', 'discussion', 'quiz', 'query'];

    const dbs = {};

    dbKeys.forEach(key=>{
        dbs[key] = dbNames[key](id);
    });

    it('Should correct parse db names', function () {
        for (let i in dbs) {
            if (dbs.hasOwnProperty(i)) {
                assert.equal(i, dbNames.parseDbName(dbs[i]))
            }
        }
    });

    it('Should check DB is not System', function () {
        Object.keys(dbs).forEach(key=>{
            assert.equal(dbNames.isSystem(dbs[key]), false);
        });
    });

    it('Should check DB is system', function () {
        assert.equal(dbNames.isSystem('123' + dbPrefix + '_db'), true);
    });

    it('Should hide DB credentials', function () {
        const dbUrl = 'http://user:pass@127.0.0.1:5984';
        assert.notEqual(dbUrl, dbNames.noCred(dbUrl));
    });

    it('Should extract user id from DB name', function () {
        const id = '1-2-3';
        assert.equal(id, dbNames.getUserId(dbNames.user_rw(id)));
    });
});