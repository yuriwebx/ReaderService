(function () {
   'use strict';
   var config = require(__dirname + '/../../../utils/configReader.js');
   var nano = require('nano')(config.database_url);
   var q = require('q');
   var dbNamePrefix = [config.database_name, ''];
   if (config.environment_name) {
      dbNamePrefix.unshift(config.environment_name);
   }
   dbNamePrefix = dbNamePrefix.join('_').toLowerCase();
   var logger = require(__dirname + '/../../../utils/logger.js').getLogger(__filename);
   var destDbName = 'db';
   var bulkSize = 100;

   var getAtts = function (db, docId) {
      var deferred = q.defer();
      db.get(docId, {attachments : true, revs_info : true}, function (e, r) {
         if (e) {
            deferred.reject(e.message);
         }
         else {
            var result = [];
            if (r._attachments) {
               for (var i in r._attachments) {
                  if (r._attachments.hasOwnProperty(i)) {
                     result.push({
                        id : docId,
                        fName : i,
                        contentType : r._attachments[i].content_type,
                        data : new Buffer(r._attachments[i].data, 'base64')
                     });
                  }
               }
            }
            deferred.resolve(result);
         }
      });
      return deferred.promise;
   };
   var setAtts = function (db, data, startRevision) {
      var deferred = q.defer();

      var insert = function (offset, revision) {
         if (offset >= data.length) {
            deferred.resolve();
         }
         else {
            db.attachment.insert(data[offset].id, data[offset].fName, data[offset].data, data[offset].contentType, {rev : revision}, function (e, r) {
               if (e) {
                  deferred.reject(e.message);
               }
               else {
                  insert(offset + 1, r.rev);
               }
            });
         }
      };
      insert(0, startRevision);

      return deferred.promise;
   };

   var processFunction = function (sourceDbName, callback) {
      var deferred = q.defer();
      var errFunc = function (msg) {
         logger.error('bulk insert failed from ' + sourceDbName);
         if (msg) {
            logger.error('with message: ' + msg);
         }
         deferred.reject();

      };
      nano.db.get(dbNamePrefix + sourceDbName, function (sourceInfo) {
         if (!sourceInfo) { // the source DB exists
            var
               sourceDb = nano.use(dbNamePrefix + sourceDbName),
               destDb = nano.use(dbNamePrefix + destDbName);

            nano.db.get(dbNamePrefix + destDbName, function (destInfo) {
               if (destInfo && destInfo.error) {
                  nano.db.create(dbNamePrefix + destDbName, function (err) {
                     if (!err) {
                        copyData(0);
                     }
                  })
               }
               else {
                  copyData(0);
               }
               function copyData(skip) {
                  sourceDb.list({
                     include_docs : true,
                     skip : skip,
                     limit : bulkSize,
                     attachments : true
                  }, function (err, body) {
                     if (!skip) {
                        logger.log('migration from ' + sourceDbName + ' started')
                     }
                     if (body.total_rows <= skip) {
                        logger.log('bulk insert from ' + sourceDbName + ' succeded');
                        deferred.resolve();
                     }
                     if (body.rows && body.rows.length) {
                        logger.log(body.rows.length + ' rows processed for ' + sourceDbName);
                        var insdata = [], attachmentsQueue = [];
                        body.rows.forEach(function (el) {
                           if (el.id !== '_design/Views') {
                              delete el.doc._rev;
                              if (callback) {
                                 callback(el.doc);
                              }
                              if (el.doc.hasOwnProperty('_attachments')) {
                                 attachmentsQueue.push(getAtts(sourceDb, el.doc._id));
                                 delete el.doc._attachments;
                              }
                              insdata.push(el.doc);
                           }
                        });
                        destDb.bulk({
                           docs : insdata
                        }, function (error, inserted) {
                           if (error) {
                              errFunc(error);
                           }
                           else {
                              if (attachmentsQueue.length) {
                                 var revs = {};
                                 for (var r in inserted) {
                                    if (inserted.hasOwnProperty(r)) {
                                       revs[inserted[r].id] = inserted[r].rev;
                                    }
                                 }
                                 q.all(attachmentsQueue).then(function (results) {
                                    var queue = [];
                                    for (var i = 0; i < results.length; i++) {
                                       queue.push(setAtts(destDb, results[i], revs[results[i][0].id]));
                                    }
                                    q.all(queue).then(function () {
                                       copyData(skip + bulkSize);
                                    }, errFunc);
                                 }, errFunc);
                              }
                              else {
                                 copyData(skip + bulkSize); // Recursion
                              }
                           }
                        });
                     }
                  });
               }
            });
         }
         else {
            deferred.resolve();
         }
      });
      return deferred.promise;
   };
   module.exports = processFunction;
})();