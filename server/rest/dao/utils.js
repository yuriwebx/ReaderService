/* jshint node: true */
(function () {
   'use strict';
   /* jshint camelcase:false */
   var q = require('q');
   var fs = require('fs');
   var _ = require('underscore');
   var logger = require('../../utils/logger.js');
   var validationLogger = logger.validationLogger;
   var jsonValidator = require('amanda')('json');
   var config = require(__dirname + '/../../utils/configReader.js');
   var nano = getNanoInstance(require('nano'), config.database_url, config.database_auth);
   var dbNamePrefix = [config.database_name, ''];

   if (config.environment_name) {
      dbNamePrefix.unshift(config.environment_name);
   }
   /* jshint camelcase:true */
   dbNamePrefix = dbNamePrefix.join('_').toLowerCase();
   var db = nano.use(dbNamePrefix + 'db');

   function findDB() {
      return db;
   }

   function getNanoInstance (_nano, dbURL, dbAuthToken) {
      if (!dbAuthToken) {
         return _nano(dbURL);
      }
      else {
         return _nano({
            url : dbURL,
            requestDefaults : {
               headers : {
                  Authorization  : 'Basic ' + dbAuthToken
               }
            }
         });
      }
   }

   var _cache = {};

   var deferredDbInsesrt = q.nbind(db.insert, db);
   var nanoInsert = db.insert, nanoBulk = db.bulk;
   db.insert = insert;
   db.bulk = q.nbind(bulk, db);

   function deferredInsertWrapper(data){
      return deferredDbInsesrt(data)
      .spread(function(body){
         return body;
      });
   }

   function getInsertFunction(lastArg) {
      return _.isFunction(lastArg) ? nanoInsert : deferredInsertWrapper;
   }

   function getUpdateFunction(lastArg) {
      return _.isFunction(lastArg) ? save : saveDeferred;
   }

   function insert() {
      var args = Array.prototype.slice.call(arguments);
      var lastArg = _.last(args);
      var obj = _.first(args);
      return validate(obj).then(function(){
         var insertFn = !_.has(obj, '_rev') ? getInsertFunction(lastArg) : getUpdateFunction(lastArg);
         return insertFn.apply(null, args);
      },function(){
         throw "DB Validation error";
      });
   }

   function bulk() {
      var args = Array.prototype.slice.call(arguments);
      var data = _.first(args);
      if (data && data.hasOwnProperty('docs') && _.isArray(data.docs)) {
         var ar = [];
         _.each(data.docs, function (doc) {
            ar.push(validate(doc));
         });
         q.all(ar).then(function(){nanoBulk.apply(db, args);}, function(){
            throw "DB Validation error";
         });
      }
      else {
         nanoBulk.apply(db, args);
      }

   }

   function isPromise(obj) {
      return _.has(obj, 'promise');
   }

   function _update(_itemsCache) {
      var firstReq = _.first(_itemsCache.objects);
      if (!_itemsCache.inProgress && _.has(firstReq, 'obj')) {
         _itemsCache.inProgress = true;
         firstReq.obj._rev = _itemsCache._rev;
         deferredInsertWrapper(firstReq.obj)
            .then(function (body) {
               _itemsCache._rev = body.rev;
               if (isPromise(firstReq.returnProperty)) {
                  firstReq.returnProperty.resolve(body);
               }
               else {
                  firstReq.returnProperty(null, body);
               }
            })
            .catch(function (err) {
               if (isPromise(firstReq.returnProperty)) {
                  firstReq.returnProperty.reject(err);
               }
               else {
                  firstReq.returnProperty(err);
               }
            })
            .finally(function () {
               _itemsCache.inProgress = false;
               _itemsCache.objects.shift();
               if (_itemsCache.objects.length > 0) {
                  _update(_itemsCache);
               }
               else {
                  _itemsCache._rev = '';
               }
            });
      }
   }

   function save(obj, returnProperty) {
      if (!_cache[obj._id]) {
         _cache[obj._id] = {
            _rev : '',
            inProgress : false,
            objects : []
         };
      }
      _cache[obj._id].objects.push({
         returnProperty : returnProperty,
         obj : obj
      });
      if (!_cache[obj._id]._rev) {
         _cache[obj._id]._rev = obj._rev;
      }
      _update(_cache[obj._id]);
   }

   function saveDeferred(obj) {
      var deferred = q.defer();
      save(obj, deferred);
      return deferred.promise;
   }

   var validationSchemas;
   try{
      validationSchemas = JSON.parse(fs.readFileSync(__dirname + '/../../DBSchemas/validation/DBschema.json').toString());
   }
   catch(e){
      validationSchemas={};
   }
   var errorsBuffer = {};

   function validate(document) {
      var deferred = q.defer();
      var reject = config.isPublic ? deferred.resolve : deferred.reject;
      if (document && !config.dontValidateDBUpdates && document._id !== '_design/Views' && document._deleted !== true ) {
         if (!document.hasOwnProperty('type')) {
            validationLogger.error('Object without type\n' + JSON.stringify(document, null, 3));
            reject();
         }
         else {
            var schema = getJSONSchema(document.type);
            jsonValidator.validate(document, schema, {singleError : false}, function (error) {
               if (error) {
                  var filedsList = error.getProperties().toString();
                  var bufferKey = [document.type, filedsList].join('/');
                  if (!errorsBuffer.hasOwnProperty(bufferKey)) {
                     validationLogger.error(['Error validating the record with type "' + document.type + '". Bad fields list: ' + filedsList,
                     error.getMessages().toString(),
                     JSON.stringify(document, null, 3),
                     '-----'].join('\n'));
                     errorsBuffer[bufferKey] = true;
                  }
                  reject();
               }
               else {
                  deferred.resolve();
               }
            });
         }
      }
      else {
         deferred.resolve();
      }
      return deferred.promise;
      function getJSONSchema(type) {
         if (validationSchemas.hasOwnProperty(type)) {
            return validationSchemas[type];
         }
         else {
            logger.getLogger('Dao').error("Can't find schema for " + type);
            return false;
         }
      }
   }

   module.exports = {
      findDB : findDB,
      nano : nano,
      dbNamePrefix : dbNamePrefix,
      dbName : dbNamePrefix + 'db'
   };
})();