/* jshint node:true */
(function () {
   "use strict";
   var fs = require('fs');
   var q = require('q');
   var jsonValidator = require('amanda')('json');
   var logger = require('./logger.js');
   var validationLogger = logger.validationLogger;
   var schema = false;
   var errorsBuffer = {};
   var applicationSession = require('../rest/bl/applicationSessions');
   var config = require(__dirname + '/configReader.js');
   fs.readFile(__dirname + '/../DBSchemas/validation/RESTAPIschema.json', function (err, contents) {
      try {
         if (err) {
            throw(err);
         }
         schema = JSON.parse(contents.toString());
      }
      catch (e) {
         logger.getLogger('validateRest.js').error(e);
      }
   });

   module.exports = {
      validateInput : function (req) {
         var deferred = q.defer();
         var reject = config.isPublic ? deferred.resolve : deferred.reject;
         if (schema) {
            var path = req.path.replace('/rest/', '/').replace(/\/$/, ''), method = req.method.toLowerCase(), key = path + '/' + method;
            if ((!schema.hasOwnProperty(path) || !schema[path].hasOwnProperty(method)) && !errorsBuffer.hasOwnProperty(key)) {
               if(method !== 'options') {
                  validationLogger.error(key + ' has not found at schema');
               }
               errorsBuffer[key] = true;
               //reject();
               deferred.resolve(); // notification should be send. workflow must not be interrupted
            }
            else if (schema && schema[path] && schema[path][method] && schema[path][method].parameters) {
               var acl = schema[path].acl||[];
               var appAcl = schema[path].appAcl||[];
               var application = (req.headers.referer||'').replace(/\/[^/]*(#.*)?$/,'').replace(/^.*\/([^/]+)$/, '$1');
               if(req.headers.referer && req.headers.referer.indexOf('oceanoflight') !== -1){
                  application = 'searcher';
               }
               var runId = req.headers['x-run-id'] || '';
               applicationSession.getUserSessionData(runId).spread(function (session, user) {
                  var role = 'user';
                  var applicationFromContext = '';
                  application = application.toLowerCase();
                  try{
                     applicationFromContext = session.context.applicationContext.application.toLowerCase();
                     if (application !== 'editor') {
                        application = applicationFromContext;
                     }
                  }
                  catch (e){
                     // do nothing
                  }
                  if(user.editorRole){
                     role = 'editor';
                  }
                  if(user.adminRole){
                     role = 'admin';
                  }
                  return {role: role, application: application};
               }, function(){
                  return {role: 'all', application: application};
               }).then(function(data){
                  if(acl.indexOf(data.role) === -1 && acl.indexOf('all') === -1){
                     validationLogger.error((data.role === 'all' ? 'Unauthenticated user' : ('User with role "' + data.role + '"')) + ' has not access to "' + path + '"', data.role === 'all');
                     reject();
                  }
                  else if(appAcl.indexOf(data.application) === -1 && appAcl.indexOf('any') === -1){
                     validationLogger.error(path + ' is not allowed to access from application "' + data.application + '"');
                     reject();
                  }
                  else {
                     var model = schema[path][method].parameters;
                     var document = req.body || req.query;
                     jsonValidator.validate(document, model, {singleError : false}, function (error) {
                        if (error) {
                           var filedsList = error.getProperties().toString();
                           var bufferKey = [key, filedsList].join('/');
                           if (!errorsBuffer.hasOwnProperty(bufferKey)) {
                              validationLogger.error(['Error validating the REST query with path "' + key + '". Bad fields list: ' + filedsList,
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
               });
            }
            else {
               deferred.resolve();
            }
         }
         else {
            deferred.resolve();
         }
         return deferred.promise;
      },
      validateOutput : function (req, body) {
         var deferred = q.defer();
         var reject = config.isPublic ? deferred.resolve : deferred.reject;
         if (schema && body) {
            try {
               body = JSON.parse(body);
               var path = req.path.replace('/rest/', '/').replace(/\/$/, ''), method = req.method.toLowerCase(), key = path + '/' + method;
               if ((!schema.hasOwnProperty(path) || !schema[path].hasOwnProperty(method)) && !errorsBuffer.hasOwnProperty(key)) {
                  if(method !== 'options') {
                     validationLogger.error(path + ': ' + method + ' has not found at schema');
                  }
                  errorsBuffer[key] = true;
                  //reject();
                  deferred.resolve(); // notification should be send. workflow must not be interrupted
               }
               else if (schema[path][method].responses) {
                  var model = schema[path][method].responses;
                  var document = body;
                  if (
                     'object' === typeof document &&
                     document.hasOwnProperty('messages') &&
                     Array.isArray(document.messages) &&
                     document.messages[0] &&
                     document.messages[0].severity &&
                     document.messages[0].severity === 'ERROR'
                  ) {
                     deferred.resolve();
                  }
                  else {
                     q.ninvoke(jsonValidator, 'validate', model, {singleError : false})
                     .then(deferred.resolve)
                     .catch(function (err) {
                        if (err && !document.statusMessages) {
                           var filedsList = err.getProperties().toString();
                           var bufferKey = [key, filedsList].join('/');
                           if (!errorsBuffer.hasOwnProperty(bufferKey)) {
                              validationLogger.err(['Error validating the REST response with path "' + key + '". Bad fields list: ' + filedsList,
                                 err.getMessages().toString(),
                                 JSON.stringify(document, null, 3),
                                 '-----'].join('\n'));
                              errorsBuffer[bufferKey] = true;
                           }
                           reject();
                        }
                     });
                  }
               }
            }
            catch (e) {
               deferred.resolve();
            }
         }
         else {
            deferred.resolve();
         }
         return deferred.promise;
      }
   };
})();

