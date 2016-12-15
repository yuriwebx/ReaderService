/* jshint browser: true*/
/*jslint node: true */
/*jshint unused: vars*/
/*jslint camelcase: false */
//if (typeof define !== 'function')
//{
//   /* jshint -W079: false */
//   var define = require('amdefine')(module);
//}

define(['./provider'], function (provider) {
   'use strict';

   var Provider = provider;

   function WebSqlProvider($q) {
      this.$q = $q;
   }

   WebSqlProvider.prototype = new Provider();
   WebSqlProvider.prototype.constructor = WebSqlProvider;

   function executeSql(tx, statement, params, callback, errback) {
      callback = callback || function () {
      };
      errback = errback || function () {
      };
      //   console.debug('STM: ' + statement);
      try {
         tx.executeSql(statement, params, callback, errback);
      } catch (error) {
         window.console.error(error.name + '. ' + error.message);
      }
   }

   function openDatabase(options) {
      if (options && options.usePlugin && window.sqlitePlugin) {
         return window.sqlitePlugin.openDatabase({
            name : options.name,
            bgType : 0
         });
      }
      else {
         return window.openDatabase(options.name, options.version, options.name, 0);

      }
   }

   WebSqlProvider.prototype.getDatabase = function (schema) {

      var upgradeDB = function () {
         var deferred = this.$q.defer();
         var db = openDatabase({name : schema.name, version : schema.version, usePlugin : true});

         db.transaction(function (tx) {
            function createStore(store) {
               var name = store.name;
               var options = store.options || {
                  keyPath : 'id',
                  autoIncrement : true
               };
               var keyPath = options.keyPath;
               var autoIncrement = options.autoIncrement;

               if (!autoIncrement) {
                  autoIncrement = true;
               }
               if (!keyPath) {
                  keyPath = 'id';
               }
               if (autoIncrement) {
                  keyPath = keyPath + ' AUTO_INCREMENT';
               }
               executeSql(tx, 'CREATE TABLE IF NOT EXISTS ' + name + ' (id UNIQUE PRIMARY KEY, data TEXT)');
            }

            function createIndex(index) {
               index.name = index.name || index.field;
               index.options = index.options || {
                  unique : false
               };
               var storeName = index.storeName;
               executeSql(tx, 'ALTER TABLE `' + storeName + '` ADD COLUMN `' + index.field + '` TEXT');
               executeSql(tx, 'CREATE' + (index.unique ? 'UNIQUE' : ' ') + ' INDEX `' + index.name + '` ON `' + storeName + '` (`' + index.field + '` ASC)');
            }

            var item = schema.items[0];
            var stores = item.stores || [];
            var indexes = item.indexes || [];
            stores.forEach(createStore);
            indexes.forEach(createIndex);

         }, function (err) {
            window.console.error(err.message);
            deferred.reject(err);
         }, function () {
            deferred.resolve(db);
         });
         return deferred.promise;
      }.bind(this);

      var deferred = this.$q.defer();
      try {
         var versionDB = openDatabase({name : 'irls-version-db', version : 1, usePlugin : true});
         versionDB.transaction(function (tx) {
            executeSql(tx, 'CREATE TABLE IF NOT EXISTS version (version)');
            executeSql(tx, 'SELECT * FROM version', [], function (tx, results) {
               var currentVersion;
               if (results.rows.length > 0) {
                  currentVersion = results.rows.item(0).version;
               }
               else {
                  currentVersion = 0;
               }

//               if (schema.version === currentVersion && schema.isUpdateNeeded !== "true") {
//                  var db = openDatabase({name : schema.name, version : schema.version, usePlugin : true});
//                  deferred.resolve(db);
//               }
               if (schema.version < currentVersion) {
                  throw new Error('Current version ' + currentVersion + ', requested version ' + schema.version);
               }
               else {
                  if (currentVersion === 0) {
                     executeSql(tx, 'INSERT INTO `version` (version) VALUES (?);', [ schema.version ]);
                  }
                  else {
                     executeSql(tx, 'UPDATE `version` SET `version` = ' + currentVersion);
                  }
                  upgradeDB(currentVersion, schema.version).then(function (db) {
                     if (currentVersion === 0 || schema.isUpdateNeeded === "true") {
                        db.isNew = true;
                     }
                     deferred.resolve(db);
                  }, function () {
                     deferred.reject();
                  });
               }

            });
         });

      } catch (error) {
         deferred.reject(error);
      }

      return deferred.promise;
   };

   WebSqlProvider.prototype.get = function (db, storeName, key) {
      var deferred = this.$q.defer();
      try {
         db.transaction(function (tx) {
               tx.executeSql('SELECT `data` FROM `' + storeName + '` WHERE `id` = "' + key + '"', [], function (tx, results) {
                  if (results.rows.length === 1) {
                     var data = results.rows.item(0).data;
                     deferred.resolve(JSON.parse(data));
                  }
                  else {
                     deferred.resolve(undefined);
                  }
               });
            }, function (error) {
               window.console.error(error.message);
               deferred.reject(error);
            });
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   WebSqlProvider.prototype.remove = function (db, storeName, key) {
      var deferred = this.$q.defer();
      try {
         db.transaction(function (tx) {
            tx.executeSql('DELETE FROM `' + storeName + '` WHERE `id` = "' + key + '"', [], function () {
               deferred.resolve(undefined);
            });
         }, function (error) {
            window.console.error(error.message);
            deferred.reject(error);
         });
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   WebSqlProvider.prototype.add = function (db, storeName, item, key, schema) {
      var deferred = this.$q.defer();
      var keyFieldName = this.getIdFieldNameByStoreName(storeName, schema);
      var indexFields = this.getIndexFieldNamesByStoreName(storeName, schema);
      var indexFieldNames = indexFields.map(function (indexField) {
         return '`' + indexField.field + '`';
      });
      var placeHolders = [];
      for (var i = 0; i < indexFieldNames.length; ++i) {
         placeHolders.push('?');
      }
      var values = [item[keyFieldName]];
      indexFields.forEach(function (indexField) {
         values.push(item[indexField.field]);
      });
      values.push(JSON.stringify(item));

      try {
         db.transaction(function (tx) {
               executeSql(tx, 'INSERT INTO `' + storeName + '` (`id`, ' + (indexFieldNames.length > 0 ? indexFieldNames.join(', ') + ', ' : '') + '`data`) ' +
                     'VALUES(?, ' + (placeHolders.length > 0 ? placeHolders.join(', ') + ', ' : '') + '?);',
                  values);
            }, function (error) {
               window.console.error(error.message);
               deferred.reject(error);
            },
            function () {
               deferred.resolve();
            }
         );
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   WebSqlProvider.prototype.put = function (db, storeName, item, key, schema) {
      var deferred = this.$q.defer();
      var keyFieldName = this.getIdFieldNameByStoreName(storeName, schema);

      try {
         if (key === null || key === undefined) {
            key = item[keyFieldName];
         }
         var that = this;
         this.get(db, storeName, key).then(function (result) {
            if (result === undefined) {
               that.add(db, storeName, item, key, schema).then(function () {
                  deferred.resolve();
               }, function (err) {
                  deferred.reject(err);
               });
            }
            else {
               var indexFields = that.getIndexFieldNamesByStoreName(storeName, schema);
               var updateFields = indexFields.map(function (indexField) {
                  return '`' + indexField.field + '` = ?';
               });
               updateFields.push('`data` = ?');
               var values = [];
               values.push(JSON.stringify(item));
               values.push(key);
               db.transaction(function (tx) {
                  executeSql(tx, 'UPDATE `' + storeName + '` SET ' + updateFields.join(',') + ' WHERE id = ?', values);
               }, function (error) {
                  window.console.error(error.message);
                  deferred.reject(error);
               }, function () {
                  deferred.resolve();
               });
            }
         }, function (err) {
            deferred.reject(err);
         });
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   WebSqlProvider.prototype.clear = function (db, storeName) {
      var deferred = this.$q.defer();
      db.transaction(function (tx) {
         executeSql(tx, 'DELETE FROM `' + storeName + '`;', function () {
            deferred.resolve();
         });
      }, function () {
         deferred.reject();
      });
      return deferred.promise;
   };

   WebSqlProvider.prototype.getAll = function (db, storeName, offset, limit) {
      var deferred = this.$q.defer();
      var totalResult = [];
      db.transaction(function (tx) {
         var statement = 'SELECT data FROM `' + storeName + '`';
         if (offset !== undefined && offset !== null) {
            statement += ' OFFSET ' + offset;
            if (limit !== undefined && limit !== null) {
               statement += ' LIMIT ' + limit;
            }
         }
         executeSql(tx, statement, [], function (tx, result) {
            for (var i = 0; i < result.rows.length; ++i) {
               totalResult.push(JSON.parse(result.rows.item(i).data));
            }
            deferred.resolve(totalResult);
         });
      });

      return deferred.promise;
   };

   WebSqlProvider.prototype.getAllByIndex = function (db, storeName, indexName, value, filter) {
      filter = filter || function () {
         return true;
      };
      var totalResult = [];
      var deferred = this.$q.defer();
      db.transaction(function (tx) {
         executeSql(tx, 'SELECT data FROM `' + storeName + '` WHERE `' + indexName + '` = ?', [value], function (tx, result) {
            for (var i = 0; i < result.rows.length; ++i) {
               var currentRow = result.rows.item(i);
               var currentData = JSON.parse(currentRow.data);
               if (filter(currentData)) {
                  totalResult.push(currentData);
               }
            }
            deferred.resolve(totalResult);
         });
      }, function (err) {
         window.console.error(err);
         deferred.reject(err);
      });
      return deferred.promise;
   };

   WebSqlProvider.prototype.getAllById = function (db, storeName, schema, idArray) {
      var deferred = this.$q.defer();
      var totalResult = [];
      db.transaction(function (tx) {
         var placeHolders = [];
         idArray.forEach(function () {
            placeHolders.push('?');
         });
         var q = 'SELECT data FROM `' + storeName + '` WHERE id IN (' + placeHolders.join(', ') + ');';
         executeSql(tx, q, idArray, function (tx, result) {
            for (var i = 0; i < result.rows.length; ++i) {
               totalResult.push(JSON.parse(result.rows.item(i).data));
            }
            deferred.resolve(totalResult);
         });
      }, function (err) {
         window.console.error(err.message);
         deferred.reject(err);
      });
      return deferred.promise;
   };

   WebSqlProvider.prototype.count = function (db, storeName) {
      var deferred = this.$q.defer();
      db.transaction(function (tx) {
         executeSql(tx, 'SELECT COUNT(*) AS c FROM `' + storeName + '`;', function (tx, result) {
            deferred.resolve(JSON.parse(result.rows.item(0).c));
         });
      }, function (err) {
         window.console.error(err.message);
         deferred.reject(err);
      });
      return deferred.promise;
   };

   WebSqlProvider.prototype.bulkInsert = function (db, storeName, data, options, schema) {
      options = options || {};
      options.exclusively = options.exclusively || false;
      var keyFieldName = this.getIdFieldNameByStoreName(storeName, schema);
      var indexFields = this.getIndexFieldNamesByStoreName(storeName, schema);
      var indexFieldNames = indexFields.map(function (indexField) {
         return '`' + indexField.field + '`';
      });
      var placeHolders = [];
      indexFieldNames.forEach(function () {
         placeHolders.push('?');
      });

      var q = 'INSERT ' + (!options.exclusively ? 'OR REPLACE' : '') + ' INTO `' + storeName + '` (`id`, ' + (indexFieldNames.length > 0 ? indexFieldNames.join(', ') + ', ' : '') + '`data`) ' +
         'VALUES(?, ' + (placeHolders.length > 0 ? placeHolders.join(', ') + ', ' : '') + '?);';
      var deferred = this.$q.defer();

      db.transaction(function (tx) {
         var promiseArray = [];
//         for (var i = 0; i < data.length; ++i)
         data.forEach(function (dataItem, index) {
            var deferred = this.$q.defer();
            var item = dataItem;
            var values = [item[keyFieldName]];
            for (var j = 0; j < indexFields.length; ++j) {
               values.push(item[indexFields[j].field]);
            }
            values.push(JSON.stringify(item));
            executeSql(tx, q, values, function (result) {
               deferred.resolve({
                  result : result
               });
            }, function (tx, error) {
               deferred.resolve({
                  error : error,
                  index : index
               });
            });
            promiseArray.push(deferred.promise);
         }.bind(this));

         this.$q.all(promiseArray).then(function (result) {
            deferred.resolve(result);
         }, function (reason) {
            deferred.reject(reason);
         });
      }.bind(this), function (err) {
         window.console.error('Error, inserting ' + data.length + ' records into ' + storeName);
         window.console.error(err.message);
//         deferred.reject(err);
      }, function () {
//         deferred.resolve();
      });
      return deferred.promise;
   };

   WebSqlProvider.prototype.removeDatabase = function (schema) {
      var db = openDatabase({name : schema.name, version : schema.version, usePlugin : true});
      var deferred = this.$q.defer();
      var clear = function (storeName) {
         db.transaction(function (tx) {
            window.console.log('Truncating table ' + storeName);
            executeSql(tx, 'DROP TABLE `' + storeName + '`;');
         }, function () {
         });
      };

      for (var i = 0; i < schema.items[0].stores.length; i++) {
         clear(schema.items[0].stores[i].name);
      }

      var versionDB = openDatabase({name : 'irls-version-db', version : 1, usePlugin : true});
      versionDB.transaction(function (tx) {
         executeSql(tx, 'DROP TABLE `version`;');
         deferred.resolve();
      });
      return deferred.promise;
   };


//   module.exports = WebSqlProvider;
   return WebSqlProvider;
});
