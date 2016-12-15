/* jshint node: true */
(function () {
   'use strict';
   var db = require('./../../rest/dao/utils').findDB();
   var q = require('q');
   var fs = require('fs');
   var logger = require('./../../utils/logger.js').validationLogger;
   var jsonValidator = require('amanda')('json');
   var schemas = {};
   var limit = 100;
   var showDetails = true;

   var getSchemas = function () {
      try {
         schemas = JSON.parse(fs.readFileSync(__dirname + '/DBschema.json').toString());
      }
      catch (err) {
         logger.error(err);
         logger.error('Could not find schema file DBschema.json');
      }
      return schemas;
   };


   var checkType = function (type, schema) {
      var deferred = q.defer();
      var skip = 0, counter = 0;
      var errors = {};
      checkPart();

      return deferred.promise;

      function validate(type, data, callback) {
         if (schemas.hasOwnProperty(type)) {
            jsonValidator.validate(data, schema, {singleError : false}, function (error) {
               if (error) {
                  error.getProperties().forEach(function (el) {
                     if (!errors[data[el[0]]._id]) {
                        errors[data[el[0]]._id] = [];
                     }
                     errors[data[el[0]]._id].push(el[1]);
                  });
               }
               callback();
            });
         }
      }

      function checkPart() {
         db.view('Views', 'documentsByType', {
            key : type,
            'include_docs' : true,
            reduce : false,
            skip : skip,
            limit : limit
         }, function (err, body) {
            if (!err) {
               var schemaData = [];
               body.rows.forEach(function (doc) {
                  if (doc.id !== '_design/Views') {
                     schemaData.push(doc.doc);
                  }
               });
               if (schemaData.length) {
                  counter += schemaData.length;
                  skip += limit;
                  validate(type, schemaData, checkPart);
               }
               else {
                  deferred.resolve({
                     errors : errors,
                     processed : counter,
                     type : type
                  });
               }

            }
            else {
               logger.error('Error getting docs from schema ' + type + '; ' + err);
               deferred.reject(err);
            }

         });
      }
   };


   module.exports = function () {
      var deferred = q.defer();
      var schemas = getSchemas();
      var queue = [];
      for (var type in schemas) {
         if (schemas.hasOwnProperty(type)) {
            queue.push(checkType(type, schemas[type]));
         }
      }
      q.all(queue).then(
         function (alldata) {
            alldata.forEach(function (data) {
               logger.log('Staistics for schema "' + data.type + '" testing: processed: ' + data.processed + ', failed: ' + (Object.keys(data.errors).length));
               if (showDetails) {
                  var msg = {};
                  for (var id in data.errors) {
                     if (data.errors.hasOwnProperty(id)) {
                        var key = uniq(data.errors[id]).join(', ');
                        if (!msg[key]) {
                           msg[key] = [];
                        }
                        msg[key].push(id);
                        //msg += '\n' + data.type + '.id= ' + id + ': Failed fields: ' + ;
                     }
                  }
                  if (msg) {
                     var out = ['Type: ' + data.type];
                     for (var fields in msg) {
                        if (msg.hasOwnProperty(fields)) {
                           out.push('Failed fields: (' + msg[fields].length + ' records) (' + fields + ')\nIDs: ' + msg[fields].slice(0, 5).join(','));
                        }
                     }
                     out.push('-------------------------------------------');
                     out.push('');
                     logger.warn(out.join('\n'));
                  }
               }
            });
            deferred.resolve();
         },
         function (err) {
            logger.error('Could\'nt check the schemas. The following error occured');
            logger.error(err);
            deferred.reject();
         });

      return deferred.promise;
   };
   function uniq(arr) {
      var res = {};
      if (Array.isArray(arr)) {
         arr.forEach(function (el) {
            res[el] = true;
         });
      }
      return Object.keys(res);
   }
})();