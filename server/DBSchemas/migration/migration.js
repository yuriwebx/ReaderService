/* jslint node: true */
/* jslint camelcase: false */
(function () {
   'use strict';
   var fs = require('fs');
   var q = require('q');
   var dao = require('./../../rest/dao/utils');
   var nano = dao.nano;
   var logger = require(__dirname + '/../../utils/logger.js').validationLogger;
   var db;
   var checkVersionDeferred = q.defer();
   var isDBCreated = false;

   nano.db.list(function (err, dbs) {
      if (err) {
         throw new Error(err);
      }
      var isNew = true;
      for (var i = 0; i < dbs.length; i++) {
         if (dao.dbName === dbs[i]) {
            isNew = false;
            break;
         }
      }
      if (isNew) {
         nano.db.create(dao.dbName, function () {
            db = nano.use(dao.dbName);
            isDBCreated = true;
            checkVersionDeferred.resolve();
         });
      }
      else {
         db = nano.use(dao.dbName);
         checkVersionDeferred.resolve();
      }
   });


   var processSchema = function (updater) {
      var step = 100;
      return q.ninvoke(db, 'get', null)
         .then(function (response) {
             var requests = [];
             try{
                 var docsCount = response[0].doc_count;
                 var chunksCount = Math.ceil(docsCount / step);

                 for (var i = 0; i < chunksCount; i++) {
                     requests.push(q.ninvoke(db, 'list', {
                         include_docs : true,
                         skip  : i * step,
                         limit : step
                     }));
                 }
             } catch(exception){
                 var i =0;
             }
            return q.all(requests);
         })
         .then(function (responses) {
            return q.all(responses
               .map(function (response) {
                  var updatedDocs = response[0].rows
                  .filter(function (row) {
                     return row.doc._id !== '_design/Views';
                  })
                  .map(function (row) {
                     var res = updater(row.doc);
                     if ('delete' === res) {
                        res = {
                           _id : row.doc._id,
                           _rev : row.doc._rev,
                           _deleted : true
                        };
                     }
                     return res;
                  })
                  .filter(function (doc) {
                     return doc;
                  });
                  return q.ninvoke(db, 'bulk', {docs: updatedDocs});
            }));
         });
   };

   var updateToVersion = function (version) {
      var updater = {}, init = q;
      try {
          if (fs.existsSync(__dirname + '/db') && fs.existsSync(__dirname + '/db/' + version + '.js')) {
              updater = require(__dirname + '/db/' + version + '.js');
              if (updater && updater.hasOwnProperty('init')) {
                  init = updater.init;
              }
          }
      } catch(exception){
          var i =0;
      }

      return init().then(function () {
         return updater && updater.hasOwnProperty('process') ? processSchema(updater.process) : null;
      });
   };

   var migrateSchema = function (startVersion, endVersion) {
      return Array.apply(null, new Array(endVersion - startVersion))
         .map(function () {
            return ++startVersion;
         })
         .reduce(function (promise, version) {
            return promise.then(function () {
               return updateToVersion(version);
            });
         }, q());
   };

   var getVersion = function () {
      return q.ninvoke(db, 'get', 'version')
         .then(function (response) {
            return response[0];
         }, function (err) {
            if ((err.status_code && err.status_code !== 404) || (err.statusCode && err.statusCode !== 404)) {
               throw err;
            }
            return {type: 'version'};
         });
   };

   var getMaxVersion = function () {
      return q.nfcall(fs.readdir, __dirname + '/db/')
         .then(function (files) {
            var ver = 0, curr;
            for (var i = 0; i < files.length; i++) {
               curr = files[i].match(/^(\d+)\.js$/);
               if (curr && curr[1] && (parseInt(curr[1], 10) > ver)) {
                  ver = parseInt(curr[1], 10);
               }
            }
            return ver;
         });
   };

   var checkSchemaVersion = function (schemaData) {
      return checkVersionDeferred.promise
         .then(function () {
            if (!schemaData) {
               schemaData = fs.readFileSync(__dirname + '/../db.json');
            }
            if (Buffer.isBuffer(schemaData)) {
               schemaData = JSON.parse(schemaData);
            }
            if (!schemaData) {
               throw 'No schema data';
            }
            var viewsData = require(__dirname + '/../views.js');
            for(var type in viewsData){
               if(viewsData.hasOwnProperty(type)) {
                  schemaData[type] = viewsData[type];
               }
            }
            return q.all([getVersion(), getMaxVersion()])
               .spread(function (data, newVersion) {
                  var oldVersion = 1 * (data.version || 1);
                  var result = null;
                  if (isDBCreated) {
                     data.version = newVersion;
                     result = q.ninvoke(db, 'insert', data, 'version')
                        .thenResolve(isDBCreated);
                  }
                  else {
                     if (newVersion > oldVersion) {
                        result = migrateSchema(oldVersion, newVersion)
                           .then(function () {
                              data.version = newVersion;
                              return q.ninvoke(db, 'get', 'version')
                               .then(function (response) {
                                   return response[0];
                               }, function (err) {
                                   if ((err.status_code && err.status_code !== 404) || (err.statusCode && err.statusCode !== 404)) {
                                       throw err;
                                   }
                                   return {type: 'version'};
                               });
                           })
                           .then(function (response) {
                               if(response.length > 0)
                                data._rev = response[0]._rev;
                              return q.ninvoke(db, 'insert', data);
                           })
                           .thenResolve(isDBCreated);
                     }
                  }
                  return result;
               });
         })
         .catch(function (err) {
            if (err.code === 'ENOENT') {
               logger.error('Can\'t read file db.json');
            }
            else if (err instanceof SyntaxError) {
               logger.error('Can\'t read JSON from file db.json');
            }
            logger.info(err.stack);
            return q.reject(err);
         });
   };
   module.exports = {
      checkSchemaVersion : checkSchemaVersion
   };
})();