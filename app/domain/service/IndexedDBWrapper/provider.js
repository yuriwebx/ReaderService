

//if (typeof define !== 'function')
//{
//   /* jshint -W079: false */
//   var define = require('amdefine')(module);
//}

define([], function() {
   'use strict';
   
   function abstractMethod()
   {
      throw new Error('Abstract method not implemented');
   }
   
   function Provider()
   {
   }
   
   function isInArray(value, idArray, keyFieldName)
   {
      for (var i = 0; i < idArray.length; ++i)
      {
         if (idArray[i] === value[keyFieldName])
         {
            return true;
         }
      }
      return false;
   }
   
   function getIdFieldNameByStoreName(storeName, schema)
   {
      var storeMetaInfo = schema.items.reduce(function(total, current)
      {
         var store = current.stores.reduce(function(total, current)
         {
            return current.name === storeName ? current : total;
         }, null);
         return store.name === storeName ? store : total;
      }, null);
   
      var keyFieldName = storeMetaInfo.options && storeMetaInfo.options.keyPath || 'id';
      return keyFieldName;
   }
   
   function getIndexFieldNamesByStoreName(storeName, schema)
   {
      var storeIndexes = schema.items.reduce(function(total, current)
      {
         var indexes = current.indexes.reduce(function(total, current)
         {
            if (current.storeName === storeName)
            {
               if (!current.name) {
                  current.name = current.field;
               }
               total.push(current);
            }
            return total;
         }, []);
         if (indexes)
         {
            total = total.concat(indexes);
         }
         return total;
      }, []);
      
      return storeIndexes;
   }
   
   Provider.prototype.getDatabase = abstractMethod;
   Provider.prototype.get = abstractMethod;
   Provider.prototype.add = abstractMethod;
   Provider.prototype.put = abstractMethod;
   Provider.prototype.clear = abstractMethod;
   Provider.prototype.getAll = abstractMethod;
   Provider.prototype.getAllByIndex = abstractMethod;
   Provider.prototype.getAllById = abstractMethod;
   Provider.prototype.count = abstractMethod;
   Provider.prototype.bulkInsert = abstractMethod;
   Provider.prototype.removeDatabase = abstractMethod;
   Provider.prototype.isInArray = isInArray;
   Provider.prototype.getIdFieldNameByStoreName = getIdFieldNameByStoreName;
   Provider.prototype.getIndexFieldNamesByStoreName = getIndexFieldNamesByStoreName;
   
//   module.exports = Provider;
   return Provider;
});
