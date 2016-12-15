/* jshint browser: true*/
/*jslint node: true */
/*jshint unused: vars*/
//if (typeof define !== 'function')
//{
//   /* jshint -W079: false */
//   var define = require('amdefine')(module);
//}

define(['./provider'], function (provider) {
   'use strict';

   var Provider = provider;


   function IndexedDBProvider($q) {
      this.TransactionMode = {
         READ_WRITE : 'readwrite',
         READ_ONLY : 'readonly'
      };

      this.$q = $q;


      if (!window.indexedDB) {
         window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
      }
   }

   IndexedDBProvider.prototype = new Provider();
   IndexedDBProvider.prototype.constructor = IndexedDBProvider;

   IndexedDBProvider.prototype.getDatabase = function (schema) {
      var deferred = this.$q.defer();
      var isNew = (schema.isUpdateNeeded === "true");

      try {
         var request = window.indexedDB.open(schema.name, schema.version);
         request.onsuccess = function (event) {
            var db = event.target.result;
            db.isNew = isNew;
            isNew = false;
            deferred.resolve(db);
         };

         request.onupgradeneeded = function (event) {
            var db = event.target.result;
            var oldVersion = event.oldVersion;
            var newVersion = event.newVersion;

            if (oldVersion === 0 || oldVersion < newVersion) {
               isNew = true;
            }

            var objectStoreNames;
            var trnasaction = this.transaction;

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

               try {
                  db.createObjectStore(name, {
                     keyPath : keyPath,
                     autoIncrement : autoIncrement
                  });
               } catch (error) {
                  throw error;
               }
            }

            function createIndex(index) {
               index.name = index.name || index.field;
               index.options = index.options || {
                  unique : false
               };
               var storeName = index.storeName;
               if (!objectStoreNames.contains(storeName)) {
                  throw new Error('Trying to create index for ' + 'non existing store "' + storeName + '"');
               }
               var store = trnasaction.objectStore(storeName);
               store.createIndex(index.name, index.field, {
                  unique : index.options.unique
               });
            }

            if (oldVersion === 0) {
               var item = schema.items[0];
               var stores = item.stores || [];
               var indexes = item.indexes || [];

               stores.forEach(createStore);
               objectStoreNames = db.objectStoreNames;
               indexes.forEach(createIndex);
            }

         };

         request.onerror = function (event) {
            deferred.reject(event.target.error);
         };
      } catch (error) {
         deferred.reject(error);
      }

      return deferred.promise;
   };

   IndexedDBProvider.prototype.get = function (db, storeName, key) {
      var deferred = this.$q.defer();
      try {
         var tran = db.transaction([ storeName ], this.TransactionMode.READ_ONLY);
         var store = tran.objectStore(storeName);
         var request = store.get(key);

         request.onsuccess = function (event) {
            deferred.resolve(event.target.result);
         };

         request.onerror = function (event) {
            var error = event.target.error;
            deferred.reject(error);
         };
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };
   IndexedDBProvider.prototype.remove = function (db, storeName, key) {
      var deferred = this.$q.defer();
      try {
         var tran = db.transaction([ storeName ], this.TransactionMode.READ_WRITE);
         var store = tran.objectStore(storeName);
         var request = store.delete(key);

         request.onsuccess = function (event) {
            deferred.resolve(event.target.result);
         };

         request.onerror = function (event) {
            var error = event.target.error;
            deferred.reject(error);
         };
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   IndexedDBProvider.prototype.add = function (db, storeName, item, key) {
      var deferred = this.$q.defer();
      try {
         var tran = db.transaction([ storeName ], this.TransactionMode.READ_WRITE);
         var store = tran.objectStore(storeName);
         var request;
         if (!!key) {
            request = store.add(item, key);
         }
         else {
            request = store.add(item);
         }

         request.onsuccess = function (event) {
            deferred.resolve({
               id : event.target.result
            });
         };

         request.onerror = function (event) {
            var error = event.target.error;
            deferred.reject(error);
         };
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   IndexedDBProvider.prototype.put = function (db, storeName, item, key) {
      var deferred = this.$q.defer();
      try {
         var tran = db.transaction([ storeName ], this.TransactionMode.READ_WRITE);
         var store = tran.objectStore(storeName);
         var request;
         if (!!key) {
            request = store.put(item, key);
         }
         else {
            request = store.put(item);
         }

         request.onsuccess = function (event) {
            deferred.resolve({
               id : event.target.result
            });
         };

         request.onerror = function (event) {
            var error = event.target.error;
            deferred.reject(error);
         };
      } catch (error) {
         deferred.reject(error);
      }
      return deferred.promise;
   };

   IndexedDBProvider.prototype.clear = function (db, storeName) {
      var deferred = this.$q.defer();
      var tran = db.transaction([storeName], this.TransactionMode.READ_WRITE);
      var store = tran.objectStore(storeName);
      var request = store.clear();

      request.onsuccess = function () {
         deferred.resolve();
      };

      request.onerror = function (event) {
         deferred.reject(event.target.error);
      };
      return deferred.promise;
   };

   IndexedDBProvider.prototype.getAll = function (db, storeName, offset, limit) {
      var deferred = this.$q.defer();
      var tran = db.transaction([storeName], this.TransactionMode.READ_ONLY);
      var store = tran.objectStore(storeName);
      var request = store.openCursor();

      var result = [];
      var index = -1, counter = 0;
      request.onsuccess = function (event) {
         var cursor = event.target.result;
         if (cursor) {
            if (offset === undefined || offset === null || (++index >= offset)) {
               if (limit === undefined || limit === null || (++counter <= limit)) {
                  result.push(cursor.value);
               }
            }
            cursor['continue']();
         }
         else {
            deferred.resolve(result);
         }

      };

      request.onerror = function (event) {
         deferred.reject(event.target.error);
      };

      return deferred.promise;
   };

   IndexedDBProvider.prototype.getAllByIndex = function (db, storeName, indexName, value, filter) {
      filter = filter || function () {
         return true;
      };
      var deferred = this.$q.defer();
      var keyRange = window.IDBKeyRange.only(value);

      var result = [];
      var tran = db.transaction([storeName], this.TransactionMode.READ_ONLY);
      var store = tran.objectStore(storeName);
      var index = store.index(indexName);
      var request = index.openCursor(keyRange);
      request.onsuccess = function (event) {
         var cursor = event.target.result;
         if (cursor) {
            if (filter(cursor.value)) {
               result.push(cursor.value);
            }
            cursor['continue']();
         }
         else {
            deferred.resolve(result);
         }
      };
      request.onerror = function (event) {
         deferred.reject(event.target.error);
      };
      return deferred.promise;
   };

   IndexedDBProvider.prototype.getAllById = function (db, storeName, schema, idArray) {
//      var keyFieldName = this.getIdFieldNameByStoreName(storeName, schema);

      var tran = db.transaction([storeName], this.TransactionMode.READ_ONLY);
      var store = tran.objectStore(storeName);

      var promiseArray = [];

      function onSuccessHandler(event) {
         /*jshint validthis: true */
         var record = event.target.result;
         this.deferred.resolve(record);
      }

      function onErrorHadler(event) {
         /*jshint validthis: true */
         var error = event.target.error;
         this.deferred.reject(error);
      }

      for (var i = 0; i < idArray.length; ++i) {
         var request = store.get(idArray[i]);
         var deferredRequest = this.$q.defer();
         request.onsuccess = onSuccessHandler.bind({
            deferred : deferredRequest
         });
         request.onerror = onErrorHadler.bind({
            deferred : deferredRequest
         });
         promiseArray.push(deferredRequest.promise);
      }

      return this.$q.all(promiseArray);
   };

   IndexedDBProvider.prototype.count = function (db, storeName) {
      var deferred = this.$q.defer();
      var tran = db.transaction([storeName], this.TransactionMode.READ_ONLY);
      var store = tran.objectStore(storeName);
      var request = store.count();

      request.onsuccess = function (event) {
         var count = event.target.result;
         deferred.resolve(count);
      };

      request.onerror = function (event) {
         deferred.reject(event.target.error);
      };
      return deferred.promise;
   };

   IndexedDBProvider.prototype.bulkInsert = function (db, storeName, data, options) {
      options = options || {};
      options.exclusively = options.exclusively || false;
      var transaction = db.transaction([storeName], this.TransactionMode.READ_WRITE);
      var store = transaction.objectStore(storeName);
      var promiseArray = [];

      var binder = function (index) {
         var request, deferred;
         if (options.exclusively) {
            request = store.add(data[index]);
         }
         else {
            request = store.put(data[index]);
         }
         deferred = this.$q.defer();
         request.onsuccess = function (event) {
            deferred.resolve({
               id : event.target.result
            });
         };

         request.onerror = function (event) {
            deferred.resolve({
               error : event.target.error,
               index : index
            });
         };
         promiseArray.push(deferred.promise);
      }.bind(this);

      for (var i = 0; i < data.length; ++i) {
         binder(i);
      }
      return this.$q.all(promiseArray);
   };

   IndexedDBProvider.prototype.removeDatabase = function (databaseName) {
      var deferred = this.$q.defer();
      var request = window.indexedDB.deleteDatabase(databaseName);
      request.onsuccess = function () {
         deferred.resolve();
      };

      request.onerror = function (error) {
         deferred.reject(error);
      };

      return deferred.promise;
   };

//   module.exports = IndexedDBProvider;
   return IndexedDBProvider;
});
