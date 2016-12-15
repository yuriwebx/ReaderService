/* jshint node:true */
(function () {
   'use strict';
   var _ = require('underscore');
   var config = require(__dirname + '/configReader.js');
   var db = require('../rest/dao/utils').findDB();
   var logger = require('../utils/logger.js').getLogger(__filename);
   var crypto = require('crypto');
   var q = require('q');
   //JSON Schema validator
   var amanda = require('amanda')('json');
   var userTypeEnum = ['Editors', 'Active Users', 'Inactive Users', 'Administrators', 'Registered'];

   function addSeverityResponse(message, typeSeverity, response) {
      logger.error(message, true);
      var responseType = typeof response;
      if (responseType !== "object") {
         response = {statusMessages : []};
      }
      else if (response !== null && !response.hasOwnProperty('statusMessages')) {
         response.statusMessages = [];
      }
      response.statusMessages.push({
         severity : typeSeverity,
         text : typeof message === 'string' ? message : JSON.stringify(message)
      });
      return response;
   }

   function handlerReject(mod, defer, message, status) {
      function processingReject(defer, message, status) {
         logger.error(message);
         defer.reject({
            text : message,
            status : status
         });
      }

      if (mod === config.handlerRejectMode.callFunction) {
         processingReject(defer, message, status);
      }
      else if (mod === config.handlerRejectMode.callback) {
         return (function (defer) {
            var defered = defer;

            function processingRejectCallback(reason) {
               logger.error(reason);
               defered.reject(reason);
            }

            return processingRejectCallback;
         })(defer);
      }
      else {
         logger.warn('Reject mode not found');
         if (defer) {
            defer.reject();
         }
         return;
      }
   }

   var calculateReadingTime = function (exercises) {
      var readingTime = 0;
      if (exercises) {
         readingTime += config.timeExercises.quizQuestion * exercises.numberQuizQusetions +
         config.timeExercises.flashcard * exercises.flashcards +
         config.timeExercises.essay * Math.round(exercises.essaysWordLimit / 10) +
         config.timeExercises.microJournaling * exercises.microJournaling;
      }
      return readingTime;
   };

   var uniqueElements = function (array) {
      var tempObj = {},
         len = Array.isArray(array) ? array.length : 0,
         i;
      for (i = 0; i < len; i++) {
         if (!tempObj.hasOwnProperty(array[i])) {
            tempObj[array[i]] = null;
         }
      }
      return Object.keys(tempObj);
   };

   function getPhotoObj(profile) {
      var photoHash = _.has(profile, 'photo.fileHash') ? profile.photo.fileHash : profile.photo;

      return  photoHash && {
         fileHash : photoHash
      };
   }

   module.exports = {
      getPhotoObj: getPhotoObj,
      calculateReadingTime : calculateReadingTime,
      uniqueElements : uniqueElements,
      uploadAttachment : function (requestData, rawData) {
         var deferred = q.defer(),
            fileHash = this.getMD5Hash(rawData);

         db.view('Views', 'attachmentsById', {key : fileHash}, function (err, body) {
            if (err) {
               deferred.reject();
            }
            else {
               if (body && body.hasOwnProperty('rows') && body.rows.length) {
                  deferred.resolve({fileHash : fileHash});
               }
               else {
                  db.insert({type : 'attachment'}, fileHash, function (err, data) {
                     if (data) {
                        db.attachment.insert(fileHash, fileHash, rawData, requestData.fileType, {rev : data.rev},
                           function (err) {
                              if (err) {
                                 deferred.reject();
                              }
                              else {
                                 deferred.resolve({fileHash : fileHash});
                              }
                           });
                     }
                     else {
                        deferred.reject(err);
                     }
                  });

               }
            }
         });

         return deferred.promise;
      },

      getFile : function (req) {
         var deferred = q.defer();
         var reason = {}, message = 'Nothing found';

         db.view('Views', 'attachmentsById', {key : req.fileId}, function (err, body) {
            if (err) {
               reason = addSeverityResponse(err.description, config.businessFunctionStatus.error);
               deferred.reject(reason);
            }
            else {
               if (body && body.hasOwnProperty('rows') && body.rows.length) {
                  db.attachment.get(req.fileId, req.fileId, function (err, body) {
                     if (err) {
                        reason = addSeverityResponse(err.description, config.businessFunctionStatus.error);
                        deferred.reject(reason);
                     }
                     else {
                        deferred.resolve(body);
                     }
                  });
               }
               else {
                  reason = addSeverityResponse(message, config.businessFunctionStatus.error);
                  deferred.reject(reason);
               }
            }
         });

         return deferred.promise;
      },
      validateEmail : function (email, id) {
         var defer = q.defer();
         var reason = {}, message = 'email alredy used';
         var unique = true;
         db.view('Views', 'usersByEmail', {keys : [email]}, function (err, body) {
            if (!err) {
               if (id) {
                  if (body.rows.length === 0) { //not found email
                     defer.resolve(unique);
                  }
                  else if (body.rows[0].id === id) {
                     defer.resolve(unique);
                  }
                  else {
                     unique = false;
                     defer.resolve(unique);
                  }
               }
               else if (body.rows.length === 0) { //not found email
                  defer.resolve(unique);
               }
               else {
                  unique = false;
                  defer.resolve(unique);
               }
            }
            else {
               reason = addSeverityResponse(message, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
         });
         return defer.promise;
      },
      getHash : function (password, salt, encoding) {
         /* global Buffer:false */
         var hash;
         if (encoding === "sha1") {
            hash = new Buffer(crypto.pbkdf2Sync(password, salt, 2500, 512), 'binary').toString('base64');
         }
         else if (encoding === "plain") {
            hash = password;
         }
         return hash;
      },
      handlerReject : handlerReject,
      addSeverityResponse : addSeverityResponse,
      getMD5Hash : function (value) {
         return crypto.createHash('md5').update(typeof value === 'string' ? value : JSON.stringify(value)).digest("hex"); //TO DO rename or delete
      },
      generateHashCode : function () {
         var value = Math.random().toString(36).substr(2, 16);
         return crypto.createHash('md5').update(JSON.stringify(value)).digest("hex");
      },
      generateTaskConfirmationHashCode : function () {
         return parseInt(crypto.randomBytes(8).toString('hex'), 16).toString().substr(0, 10);
      },
      getRandomString : function (length) {
         return Math.random().toString(36).substr(2, length);
      },
      stringToBoolean : function (profile) {
         for (var i in profile) {
            if (profile.hasOwnProperty(i)) {
               if (profile[i] === "true") {
                  profile[i] = true;
               }
               if (profile[i] === "false") {
                  profile[i] = false;
               }
            }
         }
         return profile;
      },
      isValid : function (profile, functionName) {
         var defer = q.defer();
         var emailPattern = /^[A-Za-z-\.0-9_-]{1,24}\@{1}[A-Za-z-\.0-9_-]{1,24}$/;
         var schemas = {
            searchUsers : {
               type : 'object',
               properties : {
                  category : {
                     required : true,
                     type : 'string',
                     enum : userTypeEnum
                  },
                  filter : {
                     required : true,
                     type : 'string'
                  },
                  itemsCount : {
                     required : true,
                     type : 'number'
                  }

               }
            },
            getUserProfile : {
               type : 'string',
               required : true
            },
            persistUserProfile : {
               type : 'object',
               properties : {
                  firstName : {
                     required : true,
                     type : 'string',
                     pattern : /^[A-Za-z- ]{1,25}$/
                  },
                  lastName : {
                     required : true,
                     type : 'string',
                     pattern : /^[A-Za-z- ]{1,25}$/
                  },
                  editorRole : {
                     required : true,
                     type : 'boolean'
                  },
                  adminRole : {
                     required : true,
                     type : 'boolean'
                  },
                  active : {
                     required : true,
                     type : 'string'
                  }
               }

            },
            updatePersonalProfile : {
               type : 'object',
               properties : {
                  email : {
                     required : true,
                     type : 'string',
                     pattern : emailPattern
                  },
                  lastName : {
                     required : true,
                     type : 'string',
                     pattern : /^[A-Za-z- ]{1,25}$/
                  },
                  firstName : {
                     required : true,
                     type : 'string',
                     pattern : /^[A-Za-z- ]{1,25}$/
                  }
               }

            },
            taskValidate : {
               type : 'object',
               properties : {
                  userId : {
                     required : true,
                     type : 'string'
                  },
                  taskHashCode : {
                     required : true,
                     type : 'string'
                  },
                  taskConfirmationHashCode : {
                     required : true,
                     type : 'string'
                  },
                  email : {
                     required : true,
                     type : 'string',
                     pattern : emailPattern
                  },
                  registeredAt : {
                     required : true,
                     type : 'number'
                  },
                  expiredAt : {
                     required : true,
                     type : 'number'
                  },
                  status : {
                     required : true,
                     type : 'string'
                  },
                  taskType : {
                     required : true,
                     type : 'string'
                  }
               }
            }

         };

         amanda.validate(profile, schemas[functionName], function (error) {
            if (!error) {
               defer.resolve(profile);
            }
            else {
               var message = 'Not valid ' + functionName, reason = {};
               if (error && error.length !== 0) {
                  message = error[0].message;
               }
               reason = addSeverityResponse(message, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
         });
         return defer.promise;
      }

   };
}());