define([
   'module',
   'swLoggerFactory',
   '../../../../app/domain/service/IndexedDBWrapper/IndexedDBWrapper',
   'q'
], function (module, swLoggerFactory, indexedDBWrapper, q) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   var wrapper = indexedDBWrapper(q);
   var DBName = 'irls';

   var schema = {
      name : DBName,
      version : 1,
      items : [
         {
            stores : [
               {
                  name : 'publications',
                  options : {
                     keyPath : '_id',
                     autoIncrement : false
                  }
               }
            ],
            indexes : []
         }
      ]
   };

   var _connectPromise;

   function connect() {
      _connectPromise = _connectPromise || wrapper.connect(schema).fail(function(reason) {
         logger.error(reason.message);
         return q.reject(reason.message);
      });
      return _connectPromise;
   }

   function getPublicationsStore() {
      return connect().then(function (db) {
         return db.objectStore('publications');
      });
   }


   module.exports = {

      get : function (id) {
         return getPublicationsStore().then(function(store) {
            return store.get(id);
         });
      },
      set : function (id, item) {
         if (!item._id || item._id !== id) {
            item._id = id;
         }

         return getPublicationsStore().then(function(store) {
            return store.get(id).then(_insertOrUpdate);

            function _insertOrUpdate(data) {
               return !data ? store.add(item) : store.put(item);
            }
         });
      },
      getAll : function () {
         return getPublicationsStore().then(function(store) {
            return store.getAll();
         });
      },

      remove : function (id) {
         return getPublicationsStore().then(function(store) {
            return store.remove(id);
         });
      },
      setDBPrefix : function (prefix) {
         if (!_connectPromise) {
            schema.name = DBName + prefix; // I know it is suffix.
            return true;
         }
         return false;
      },

      getBaseSchemaName : function () {
         return schema.name;
      }
   };
});