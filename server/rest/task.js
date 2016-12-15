/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function() {
   'use strict';
   var errorMessegas = {
     taskEmail : 'Task "%s" with email "%s" hasn\'t been found.',
     userEmail: 'Task email "%s" hasn\'t been found.',
     mailService: 'Mail service doesn\'t have controller "%s" .',
     emailNotValid: 'E-mail address "%s" has been already used.',
     confirmAuthorizedTask: 'Unexpected case: task status "%s"; task expired date "%s"; current date "%s" .',
     taskConfirmNotFound: 'Task confirmation hash code "%s"  hasn\'t been found.',
     taskHashCode: 'Task hash code "%s" hasn\'t been found.'
   };
   var util = require('util');

   var config = require(__dirname + '/../utils/configReader.js');
   var encodingConfig = config.encodingConfig;
   var _ = require('underscore');
   var q = require('q');

   var db = require('./dao/utils').findDB();
   var dao = require('./dao/usersDao');

   var utils = require('../utils/utils.js');
   var mail = require('../mail/sendPasswordMailController.js');

   function simpleInsert(data){
      var defer = q.defer();
      var reason = {};
      db.insert(data, function(err) {
         if(err){
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else{
            defer.resolve(data);
         }
      });
      return defer.promise;
   }
   var resetPassword = config.authenticationTaskType.resetPassword;
   var confirmNewEmailTask = config.authenticationTaskType.confirmNewEmail;
   var registerUserProfile = config.authenticationTaskType.registerUserProfile;
   var confirmNewEmailAndPassword = config.authenticationTaskType.confirmNewEmailAndPassword;

   function registerTaskProcessing(task){
      var defer = q.defer();
      var type = 'uid';
      getUserProfile(type, task.userId).then(function(user){
         if(task.taskType === confirmNewEmailTask){
            user.emailConfirmationStatus = config.emailConfirmationStatus.notConfirmed;
            simpleInsert(user).then(function(){
               defer.resolve({});
            }, defer.reject);
         }
         else{
            defer.resolve({});
         }
      },defer.reject);
      return defer.promise;
   }

   var confirmTaskFunc = {};
    confirmTaskFunc[resetPassword] = function(task, defer) {
       var type = 'uid', reason = {};
       getUserProfile(type, task.userId).then(function(user){ //activate user
          var needChangeTaskStatus = (user.active === 'Registered');
          user.active = 'Approved';
          user.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByUser;
          simpleInsert(user).then(function(){
             if(!needChangeTaskStatus){
                defer.resolve({
                   data: {
                      status: task.status,
                      taskType: task.taskType
                   },
                   status: config.businessFunctionStatus.ok
                });
             }
             else{
                var taskType = config.authenticationTaskType.registerUserProfile; //set task status registration
                db.view('Views', 'emailtaskByEmail', {key: [user.email, taskType], include_docs: true}, function(err, body) {
                   var message = util.format(errorMessegas.taskEmail, taskType, user.email);
                   if(err){
                      reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.warning);
                      defer.reject(reason);
                   }
                   else if(body.rows.length !== 0){
                      var updatedTask = body.rows[0].doc;
                      var needProcessing = false;
                      updatedTask.status = config.authenticationTaskStatus.confirm;
                      setTaskStatus(updatedTask, defer, needProcessing);
                      defer.resolve({
                         data: {
                            status: task.status,
                            taskType: task.taskType
                         },
                         status: config.businessFunctionStatus.ok
                      });
                   }
                   else{
                      reason = utils.addSeverityResponse(message, config.businessFunctionStatus.warning);
                      defer.reject(reason);
                   }
                });
             }
          },defer.reject);
       }, defer.reject);
   };
   
   confirmTaskFunc[confirmNewEmailTask] = function(task, defer) {
      confirmNewEmail(task, defer);
   };

   confirmTaskFunc[registerUserProfile] = function(task, defer) {
      activeProfile(task, defer);
   };

   confirmTaskFunc[confirmNewEmailAndPassword] = function(task, defer) {
      changePassword(task, defer);
   };

   var declinedTaskFunc = {};
   declinedTaskFunc[resetPassword] = function(task, defer) {
      defer.resolve({
         data: {
            status: task.status,
            taskType: task.taskType
         },
         status: config.businessFunctionStatus.ok
      });
   };

   declinedTaskFunc[confirmNewEmailTask] = function(task, defer) {
      defer.resolve({
         data: {
            status: task.status,
            taskType: task.taskType
         },
         status: config.businessFunctionStatus.ok
      });
   };

   declinedTaskFunc[registerUserProfile] = function(task, defer) {
      removeUser(task, defer);
   };

   declinedTaskFunc[confirmNewEmailAndPassword] = function(task, defer) {
      defer.resolve({
         data: {
            status: task.status,
            taskType: task.taskType
         },
         status: config.businessFunctionStatus.ok
      });
   };
   
   function changePassword(task, defer){
      dao.findById(task.userId, {revs_info : true})
         .then(function (body) {
            var user = _.extend(body, {
               password : task.password,
               passwordSalt : utils.getRandomString(16),
               passwordEncodingMethod : encodingConfig.method
            });
            user.passwordHash = utils.getHash(user.password, user.passwordSalt, encodingConfig.method);
            user.email = task.email;
            user.type = 'UserProfile';
            user.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByUser;
            return user;
         })
         .then(dao.save)
         .then(function () {
            defer.resolve({
               data : {
                  status : task.status,
                  taskType : task.taskType
               },
               status : config.businessFunctionStatus.ok
            });
         }).catch(defer.reject);
   }

   function confirmNewEmail(task, defer){
      var reason = {};
      db.get(task.userId, {revs_info: true}, function(err, body) {
         if(err){
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else{
            var user = body;
            user.email = task.email;
            user.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByUser;
            simpleInsert(user).then(function() {
               defer.resolve({
                  data: {
                     status: task.status,
                     taskType: task.taskType
                  },
                  status: config.businessFunctionStatus.ok
               });
            }, defer.reject);
         }
      });
   }

   function activeProfile(task, defer){
      var type = 'email';
      var param = task.email;
      var isApproveRequired = config.userManagementSettings.accessApprovedRequired;
      getUserProfile(type, param).then(function(user){
         user.active = isApproveRequired ? 'Registered' : 'Approved';
         user.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByUser;
         simpleInsert(user).then(function() {
            if ( isApproveRequired ) {
               processUserProfileRegistration(task.userId);
            }
            defer.resolve({
               data : {status: task.status, taskType: task.taskType},
               status: config.businessFunctionStatus.ok
            });
         }, defer.reject);
      }, defer.reject);
   }

   function removeUser(task, defer){
      var type = 'uid';
      var param = task.userId, reason = {};
      getUserProfile(type, param).then(function(user){
         user._deleted = true;
         db.insert(user, function(err) {
            if(err){
              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
              defer.reject(reason);
            }
            else{
               defer.resolve({
                  data : {status: task.status, taskType: task.taskType},
                  status: config.businessFunctionStatus.ok
               });
            }
         });
      }, defer.reject);
   }


   var processingTask = {};
   processingTask[config.authenticationTaskStatus.confirm] = confirmTaskFunc;
   processingTask[config.authenticationTaskStatus.declined] = declinedTaskFunc;
   processingTask[config.authenticationTaskStatus.expired] = declinedTaskFunc; //TO DO make own function for expired task

   function setTaskStatus(task, defer, needProcessing){
      var message = 'Task status ' + task.status + ' has not found function.', reason = {};
      db.insert(task, function(err) {
         if(err){
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else if(processingTask.hasOwnProperty(task.status) && needProcessing){
            processingTask[task.status][task.taskType](task, defer);
         }
         else if(needProcessing){
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      });
   }

   function getUserProfile(type, param){
      var defer = q.defer();
      var reason = {};
      if(type === 'email'){
         db.view('Views', 'usersByEmail', {keys: [param], include_docs: true}, function(err, body) {
            if(err){
              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
              defer.reject(reason);
            }
            else if(body.rows.length !== 0){
               defer.resolve(body.rows[0].doc);
            }
            else{
              defer.reject({
                status: config.businessFunctionStatus.error,
                text: util.format(errorMessegas.userEmail, param)
              });
            }
         });
      }
      else if(type === 'uid'){
         db.get(param, {revs_info: true}, function(err, body) {
            if (err) {
              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
              defer.reject(reason);
            }
			else {
              defer.resolve(body);
            }
         });
      }
      return defer.promise;
   }


   function sendMail(applicationUrl, task, type, user, defer){
      var reason = {},
          message = util.format(errorMessegas.mailService, type),
          language = 'en';
      if(mail.hasOwnProperty(type)){
         mail[type](user, applicationUrl, task, language).then(function() {
            defer.resolve({
               data : {taskHashCode: task.taskHashCode},
               status: config.businessFunctionStatus.ok
            });
         }, defer.reject);
      }
      else{
        reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
        defer.reject(reason);
      }
   }

   var validateAuthenticationTask = {};
   validateAuthenticationTask[resetPassword] = function(task, defer){
      var reason = {}, message = '';
      utils.validateEmail(task.email, task.userId).then(function(unique) {
         if(unique){
            defer.resolve(task);
         }
         else{
            message =  util.format(errorMessegas.emailNotValid, task.email);
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      }, defer.reject);
   };

   validateAuthenticationTask[confirmNewEmailTask] = function(task, defer){
      var reason = {}, message = '';
      utils.validateEmail(task.email).then(function(unique) {
         if(unique){
            defer.resolve(task);
         }
         else{
            message =  util.format(errorMessegas.emailNotValid, task.email);
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      }, defer.reject);
   };

   validateAuthenticationTask[registerUserProfile] = function(task, defer){
      defer.resolve(task);
   };

   validateAuthenticationTask[confirmNewEmailAndPassword] = function(task, defer){
      var reason = {}, message = '';
      utils.validateEmail(task.email).then(function(unique){
         if(unique){
            defer.resolve(task);
         }
         else{
            message = util.format(errorMessegas.emailNotValid, task.email);
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      }, defer.reject);
   };

   function validateTask(task){
      var defer = q.defer();
      validateAuthenticationTask[task.taskType](task, defer);
      return defer.promise;
   }

   function registerEmailAuthorizedTask(applicationUrl, userEmail, taskType, uid){
      var defer = q.defer();
      var expiredAt = 86400000; //one day
      var task, reason = {};
      userEmail = userEmail.toLowerCase();
      db.view('Views', 'emailtaskByEmail', {key: [userEmail, taskType], include_docs: true}, function(err, body) {
         var profileType = !uid ? 'email' : 'uid';
         var param = profileType === 'email' ? userEmail : uid;
         getUserProfile(profileType, param)
          .then(function(user) {
            var taskConfirmationHashCode = utils.generateTaskConfirmationHashCode();
            if (err) {
              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
              defer.reject(reason);
            }
            else if (body.rows.length !== 0) {
               task = _.extend(body.rows[0].doc, {
                  userId: user._id,
                  taskConfirmationHashCode: taskConfirmationHashCode,
                  email: userEmail,
                  registeredAt: new Date().getTime(),
                  expiredAt: new Date().getTime() + expiredAt,
                  status: config.authenticationTaskStatus.register,
                  type: 'EmailAuthorizedTask'
               });
               utils.isValid(task, 'taskValidate').then(validateTask).then(simpleInsert).then(registerTaskProcessing).then(function() {
                  sendMail(applicationUrl, task, taskType, user, defer);//if user not have mail sent to use task email
               }, defer.reject);
            }
            else {
               task = {
                  userId: user._id,
                  taskHashCode: utils.generateHashCode(),
                  taskConfirmationHashCode: taskConfirmationHashCode,
                  email: userEmail,
                  registeredAt: new Date().getTime(),
                  expiredAt: new Date().getTime() + expiredAt,
                  status: config.authenticationTaskStatus.register,
                  taskType: taskType,
                  type: 'EmailAuthorizedTask'
               };
               utils.isValid(task, 'taskValidate').then(validateTask).then(simpleInsert).then(registerTaskProcessing).then(function() {
                  sendMail(applicationUrl, task, taskType, user, defer); //if user not have mail sent to use task email
               },  defer.reject);
            }
         },  defer.reject);
      });
      return defer.promise;
   }

   function confirmAuthorizedTask(taskConfirmationHashCode, confirm){
      var defer = q.defer();
      var message = '', reason = {};
      db.view('Views', 'emailtaskByConfirmationHashCode', {key: taskConfirmationHashCode, include_docs: true}, function(err, body) {
         if(err){
          defer.reject({
            severity: config.businessFunctionStatus.error,
            text: err.description + '. Have not found task confirmation hash code.'
          });
        }
         else if(body.rows.length !== 0){
            var needProcessing = true;
            var task = body.rows[0].doc;
            var date = new Date().getTime();
            if(confirm && date <= task.expiredAt && task.status === config.authenticationTaskStatus.register){
               task.status = config.authenticationTaskStatus.confirm;
               setTaskStatus(task, defer, needProcessing);
            }
            else if(!confirm && date <= task.expiredAt && task.status === config.authenticationTaskStatus.register){
               task.status = config.authenticationTaskStatus.declined;
               setTaskStatus(task, defer, needProcessing);
            }
            else if(task.status === config.authenticationTaskStatus.processed) {
              defer.resolve({
                 data: {
                    status: task.status,
                    taskType: task.taskType
                 },
                 status: config.businessFunctionStatus.ok
              });
            }
            else if(date > task.expiredAt){
               task.status = config.authenticationTaskStatus.expired;
               setTaskStatus(task, defer, needProcessing);
            }
            else{
              message = util.format(errorMessegas.confirmAuthorizedTask, task.status, task.expiredAt, date);
              reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
              defer.reject(reason);
            }
         }
         else{
            message = util.format(errorMessegas.taskConfirmNotFound, taskConfirmationHashCode);
            defer.reject({
              message: message
            });
         }
      });
      return defer.promise;
   }

   function processUserProfileRegistration (userId) {
      var recipientEmailList     = config.userManagementSettings.accountManagerEmailList;
      var accessApprovedRequired = config.userManagementSettings.accessApprovedRequired;
      if ( !accessApprovedRequired ) {
         return q.defer({});
      }
      var recipientProfile = {};
      var options = {
         link: config.buildURL.replace('reader/#/', 'admin/#/')
      };
      return dao.findById(userId)
         .then(function sendNewUserRequestEmails (response) {
            response = typeof response === 'object' ? response : {};
            var senderProfile = {
               firstName : response.firstName,
               lastName  : response.lastName,
               email     : response.email
            };
            var sendMailPromises = _.map(recipientEmailList, function (email) {
               recipientProfile.email = email;
               return mail.sendNewUserRequest(recipientProfile, senderProfile, 'en', options);
            });
            return q.all(sendMailPromises);
         });
   }

   function checkStatusOfAuthorizedTask(taskHashCode) {
      var defer = q.defer();
      var reason = {}, message = '';
      db.view('Views', 'emailtaskByTaskHashCode', {key: taskHashCode, include_docs: true}, function(err, body) {
         if(err){
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else if(body.rows.length !== 0){
            var task = body.rows[0].doc;
            defer.resolve({
               data : {status: task.status},
               status: config.businessFunctionStatus.ok
            });
         }
         else{
            message = util.format(errorMessegas.taskHashCode, taskHashCode);
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      });
      return defer.promise;
   }

   module.exports = {
      registerEmailAuthorizedTask: registerEmailAuthorizedTask,
      confirmAuthorizedTask : confirmAuthorizedTask,
      checkStatusOfAuthorizedTask : checkStatusOfAuthorizedTask
   };
})();
