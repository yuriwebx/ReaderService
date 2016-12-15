/*jslint node: true */
/*jshint unused: vars*/
/*jslint camelcase: false */
define(['./provider', './websql'], function (Provider, WebSql) {
   'use strict';

   function WebSqlBufferedProxy($q) {
      this.websql = new WebSql($q);
      this.$q = $q;
   }

   var buffer_size = 1000;

   WebSqlBufferedProxy.prototype = new Provider();
   WebSqlBufferedProxy.prototype.constructor = WebSqlBufferedProxy;

   WebSqlBufferedProxy.prototype.getDatabase = function (schema) {
      return this.websql.getDatabase(schema);
   };

   WebSqlBufferedProxy.prototype.get = function (db, storeName, key) {
      return this.websql.get(db, storeName, key);
   };

   WebSqlBufferedProxy.prototype.remove = function (db, storeName, key) {
      return this.websql.remove(db, storeName, key);
   };

   WebSqlBufferedProxy.prototype.add = function (db, storeName, item, key, schema) {
      return this.websql.add(db, storeName, item, key, schema);
   };

   WebSqlBufferedProxy.prototype.put = function (db, storeName, item, key, schema) {
      return this.websql.put(db, storeName, item, key, schema);
   };

   WebSqlBufferedProxy.prototype.clear = function (db, storeName) {
      return this.websql.clear(db, storeName);
   };

   WebSqlBufferedProxy.prototype.getAll = function (db, storeName, offset, limit) {
      return this.websql.getAll(db, storeName, offset, limit);
   };

   WebSqlBufferedProxy.prototype.getAllByIndex = function (db, storeName, indexName, value, filter) {
      return this.websql.getAllByIndex(db, storeName, indexName, value, filter);
   };

   WebSqlBufferedProxy.prototype.getAllById = function (db, storeName, schema, idArray) {
      return this.websql.getAllById(db, storeName, schema, idArray);
   };

   WebSqlBufferedProxy.prototype.count = function (db, storeName) {
      return this.websql.count(db, storeName);
   };

   WebSqlBufferedProxy.prototype.bulkInsert = function (db, storeName, data, options, schema) {
      var deferred = this.$q.defer();
      var that = this;

      function insertNextPortion() {
         var currentData = data.splice(0, buffer_size);
         that.websql.bulkInsert(db, storeName, currentData, options, schema).then(function () {
            if (data.length) {
               insertNextPortion();
            }
            else {
               deferred.resolve();
            }
         });
      }

      insertNextPortion();
      return deferred.promise;
   };

   WebSqlBufferedProxy.prototype.removeDatabase = function (params) {
      return this.websql.removeDatabase(params);
   };

   return WebSqlBufferedProxy;
});