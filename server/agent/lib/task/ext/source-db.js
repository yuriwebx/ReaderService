/**
 * Created by aliaksandr.krasitski on 5/26/2016.
 */
"use strict";

const qs = require('querystring');

const rp = require('request-promise');
const dbNames = require('../../conf/db_names.js');

const config = require('../../../config.js');
const generatorCfg = config.task_generator; //jshint ignore:line

const logger = require('../../util/log').getLogger(__filename);


function SourceDb() {
    const self = this;

    self.createFilter = (sourceDbPath)=>{
        const filter = generatorCfg.change_params.filter.split('/'); //jshint ignore:line
        const filterUrl = sourceDbPath + '/_design/' + filter[0];
        return rp(filterUrl)
            .catch((e)=>{
                if (e.statusCode === 404) {
                    logger.log('Filter does not exist in %s. create a new one', dbNames.noCred(sourceDbPath));
                    return null;
                }
                throw new Error(e);
            })
            .then((res)=>{
                const filters = {};
                filters[filter[1]] = getFilterFn();

                res = res && JSON.parse(res) || {filters: {}};

                if (res.filters && res.filters[filter[1]] !== filters[filter[1]]) {
                    res.filters = filters;

                    return rp({
                        uri: filterUrl,
                        method: 'PUT',
                        json: true,
                        body: res
                    });
                }
                return null;
            })
            .catch((e)=>{
                logger.error('Unable to create filters in [%s]:', dbNames.noCred(filterUrl), e.message);
                return Promise.reject(e);
            });
    };

    function getFilterFn() {
        return function(doc, req) {
            return doc.type === req.query.type;
        }.toString();
    }

    self.getChanges = (sourceDbPath, since, type)=>{
        generatorCfg.change_params.since = since || 0; //jshint ignore:line
        generatorCfg.change_params.type = type;        //jshint ignore:line
        return rp({
            uri: sourceDbPath + '/_changes' + '?' + qs.stringify(generatorCfg.change_params), //jshint ignore:line
            transform: JSON.parse
        });
    };
}

module.exports = SourceDb;