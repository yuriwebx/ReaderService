/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var manageUsers = require('./manageUsers.js');
var task = require('./task.js');
var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);
var applicationSession = require('./bl/applicationSessions');
//var q = require('q');

module.exports = {
  GET: {
    search: function(req, res) {
      var runId = req.headers['x-run-id'] || '';
      applicationSession.getUserId(runId).then(function () {
         manageUsers.searchUsers(req.query).then(function(userprofile) {
            res.send(userprofile);
         }, function(reason) {
            res.send(reason);
         });
      }, function (err) {
         res.send(err);
      });
    },
    profile: function(req, res) {
      manageUsers.getUserProfile(req.query.id).then(function(userprofile) {
        res.send(userprofile);
      }, function(reason) {
          res.send(reason);
        });
    },
    getFile: function(req, res) {
        manageUsers.getFile(req.query).then(
            function (data) {
               res.send(data);
            }, function (err) {
               res.send(err);
            }
        );
     }
  },
  POST: {
    persistuserprofile: function(req, res) {
      var runId = req.headers['x-run-id'] || '',
          profile = req.param("profile"),
          profilePersistingInfo = req.param("profilePersistingInfo");

      applicationSession.getUserId(runId).then(function(uid){
        manageUsers.persistUserProfile(uid, profile, profilePersistingInfo).then(function(response) {
          logger.log('Persist User Profile complited!');
          res.send(response);
        }, function(response) {
            res.send(response);
          });
      }, _onReject);

      function _onReject(err) {
         res.send(err);
      }
    },
    personalprofile: function(req, res) {
      manageUsers.updatePersonalProfile(req.body).then(function(response) {
        logger.log('Persist User Profile complited!');
        res.send(response);
      }, function(reason) {
          logger.log('Persist User Profile rejected!');
          res.send(reason);
        });
    },
    userregistration: function(req, res) {
      manageUsers.userRegistration(req.body).then(function(response) {
        logger.log('User registration completed!');
        res.send(response);
      }, function(er) {
        logger.error(er);
        res.send(er);
      });
    },
    resetpassword: function(req, res) {
      var password = req.param("password");
      var taskConfirmationHashCode = req.param("taskConfirmationHashCode");
      var taskHashCode = req.param("taskHashCode");
      manageUsers.resertPassword(password, taskConfirmationHashCode, taskHashCode).then(function(response) {
        logger.log('User reset password completed!');
        res.send(response);
      }, function(reason) {
          logger.error(reason);
          res.send(reason);
        });
    },
    registeremail: function(req, res) {
      var userEmail = req.param("userEmail");
      var taskType  = req.param("taskType");
      var applicationUrl  = req.param("applicationUrl");
      var uid = req.param("uid");
      var password = req.param("password");
      task.registerEmailAuthorizedTask(applicationUrl, userEmail, taskType, uid, password).then(function(response) {
        res.send(response);
      }, function(error) {
          logger.error(error);
          res.send(error);
        });
    },
    confirm: function(req, res) {
      var taskConfirmationHashCode = req.param("taskConfirmationHashCode");
      var confirm = JSON.parse(req.param("confirm")|| false);
      task.confirmAuthorizedTask(taskConfirmationHashCode, confirm).then(function(response) {
        res.send(response);
      }, function(error) {
         logger.error(error);
         res.send(error);
      });
    },
     confirmaccess: function (req, res) {
        applicationSession.getUserId(req.headers['x-run-id'])
           .then(function (userId) {
              return manageUsers.confirmUserAccess(req.body.userId, userId, req.body.confirm);
           })
           .then(_sendResponse)
           .catch(_sendResponse);

        function _sendResponse (response) {
           res.send(response);
        }
     },
    checkstatus: function(req, res) {
      var taskHashCode  = req.param("taskHashCode");
      task.checkStatusOfAuthorizedTask(taskHashCode).then(function(response) {
        res.send(response);
      }, function(error) {
        logger.error(error);
        res.send(error);
      });
    },
    changepassword: function(req, res) {
      var uid = req.param("uid");
      var oldPassword  = req.param("oldPassword");
      var newPassword = req.param("newPassword");
      manageUsers.changePassword(uid, oldPassword, newPassword).then(function(response){
        res.send(response);
      }, function(error){
        logger.error(error);
        res.send(error);
      });
    }
  },
  DELETE : function (req, res) {
/*    applicationSession.getUserData(req.headers['x-run-id'] || '').then(
       function (userData) {
         if (userData.adminRole) {*/
           manageUsers.deleteUser(req.param('userId','')).then(function(){
           res.send('Ok');}).catch(function () {
             res.send('Fail');
           });
/*         }
         else {
           return q.reject();
         }
       }).fail(function () {
         res.send();
       });*/
  }
  /*,
    DELETE: {},
    PUT:{}*/
};

