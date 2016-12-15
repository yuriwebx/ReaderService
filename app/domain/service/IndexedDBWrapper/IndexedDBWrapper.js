/*jslint camelcase: false */
/*jslint node: true */
/*jshint unused: vars*/
(function (window) {
   'use strict';
   define(['require', 'exports', 'module', './indexeddb', './websql', './websql_buffered_proxy'],
      function (require, exports, module, indexeddb, websql, websql_buffered_proxy) {
         var Provider;
         if (window.sqlitePlugin) {
            window.console.info('Sqlite plugin will be used');
            Provider = websql_buffered_proxy;
         }
         else if (
            (window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB) &&
            (
               window.navigator.userAgent.toLowerCase().indexOf('safari/') === -1 ||
               window.navigator.userAgent.toLowerCase().indexOf('edge/') !== -1
            ) // Safari since 8.0 supports IndexedDB, but in buggy mode. Skip it. But remember about M$ Edge
         ) {
            window.console.info('IndexedDB will be used');
            Provider = indexeddb;
         }
         else if (window.openDatabase && window.openDatabase instanceof Function) {
            window.console.info('WebSql will be used');
            Provider = websql_buffered_proxy;
         }

         module.exports = function ($q) {
            var provider = new Provider($q);
            var context = {};

            context = {
               /**
                *
                * @param {object} schema
                * {
                  name : 'irls',
                  version : 1,
                  items : [ {
                     stores : [ {
                        name : 'words',
                        options : {
                           keyPath : '_id',
                           autoIncrement : false
                        }
                     }, {
                        name : 'sentences',
                        options : {
                           keyPath : '_id',
                           autoIncrement : false
                        }
                     }, {
                        name : 'stems',
                        options : {
                           keyPath : '_id',
                           autoIncrement : false
                        }
                     } ],
                     indexes : [ {
                        storeName : 'words',
                        field : 'index',
                        name : 'index1'
                     } ]
                  } ]
               }
                * @returns {Promise}
                */
               connect : function (schema) {
                  var deferred = $q.defer();
                  provider.getDatabase(schema).then(function (db) {
                     deferred.resolve({
                        objectStore : function (storeName) {
                           return {
                              bulkInsert : function (data, options) {
                                 return provider.bulkInsert(db, storeName, data, options, schema);
                              },
                              get : function (id) {
                                 return provider.get(db, storeName, id);
                              },
                              remove : function (id) {
                                 return provider.remove(db, storeName, id);
                              },
                              put : function (item, key) {
                                 return provider.put(db, storeName, item, key, schema);
                              },
                              add : function (item, key) {
                                 return provider.add(db, storeName, item, key, schema);
                              },
                              getAll : function (offset, limit) {
                                 return provider.getAll(db, storeName, offset, limit);
                              },
                              getAllById : function (idArray) {
                                 return provider.getAllById(db, storeName, schema, idArray);
                              },
                              clear : function () {
                                 return provider.clear(db, storeName);
                              },
                              count : function () {
                                 return provider.count(db, storeName);
                              },
                              getIndex : function (indexName) {
                                 return {
                                    getAll : function (value, filter) {
                                       return provider.getAllByIndex(db, storeName, indexName, value, filter);
                                    }
                                 };
                              }
                           };
                        },
                        close : function () {
                           db.close();
                        },
                        isNew : db.isNew
                     });
                  }, function (reason) {
                     deferred.reject(reason);
                  });
                  return deferred.promise;
               },
               remove : function (schema) {
                  return provider.removeDatabase(schema.name);
               }
            };
            return context;
         };
      });
}(this));