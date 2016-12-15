/*jslint node: true */
/* globals setInterval: false */
(function() {
   'use strict';

   var q = require('q');
   var _ = require('underscore');
   var dao = require('../dao/applicationSessionsDao');
   var usersDao = require('../dao/usersDao');
   var sessions = require('./sessions');
   var authentication = require('./authentications');
   var utils = require('../../utils/utils');
   var config = require('../../utils/configReader.js');
   var logger = require('../../utils/logger.js').getLogger(__filename);
   var agentTools = require('../../utils/agent-lib');

   setInterval(applicationSessionsMonitor, config.applicationSessionsMonitor.scanInterval);
   logger.log([
      'Inactive Application Sessions Monitor started.',
      'Scan interval is',
      config.applicationSessionsMonitor.scanInterval,
      'ms'].join(' ')
   );

   function ApplicationSession(runId, session, context) {
      this.runId = runId;
      this.sessionId = (session || {}).id || '';
      this.userId = ((session || {}).user || {}).id || '';
      this.clientNodeId = (session || {}).clientNodeId || '';
      this.startedAt = new Date();
      this.endedAt = '';
      this.active = true;
      this.status = {
         online : true,
         activities : [],
         lastStatusNotification : 0
      };
      this.context = _.omit(context, 'clientNodeContex');
   }

   function isAuth(runId) {
      return getSessionId(runId).then(_aliveFilter);

      function _aliveFilter(sid) {
         return sessions.isAlive(sid);
      }
   }

   function getSessionId(runId) {
      return dao.findById(runId).then(_onSuccessFilter);

      function _onSuccessFilter(applicationSession) {
         if (applicationSession.active && applicationSession.sessionId) {
            return applicationSession.sessionId;
         }
         return q.reject(utils.addSeverityResponse('Application session not active or has not found sessionId.', config.businessFunctionStatus.error));
      }
   }

   function getAppSession(runId) {
      return dao.findById(runId);
   }

   function getSessionData(runId) {
      return getSessionId(runId).then(_getSession);

      function _getSession(sid) {
         return sessions.get(sid);
      }
   }

   function getUserId(runId) {
      return dao.findById(runId).then(_onSuccessFilter);

      function _onSuccessFilter(applicationSession) {
         if (applicationSession.active && applicationSession.userId) {
            return applicationSession.userId;
         }
         return q.reject(utils.addSeverityResponse('Application session not active or has not found userId.', config.businessFunctionStatus.error));
      }
   }

   function getUserSessionData(runId) {
      return dao.findById(runId)
         .then(_onSuccessFilter)
         .then(function (session) {
            return q.all([session, usersDao.findById(session.userId)]);
         });

      function _onSuccessFilter(applicationSession) {
         if (applicationSession.active && applicationSession.userId) {
            return applicationSession;
         }
         return q.reject(utils.addSeverityResponse('Application session not active or has not found userId.', config.businessFunctionStatus.error));
      }
   }

   function getUserData(runId) {
      return dao.findById(runId)
         .then(_onSuccessFilter)
         .then(function(userId){
            return usersDao.findById(userId);
         });

      function _onSuccessFilter(applicationSession) {
         if (applicationSession.active && applicationSession.userId) {
            return applicationSession.userId;
         }
         return q.reject(utils.addSeverityResponse('Application session not active or has not found userId.', config.businessFunctionStatus.error));
      }
   }

   function performLogin(runId, context, mode, loginInfo, externalLoginInfo, authorizedTaskLoginInfo) {
      var defer = authentication.doAuth(mode, loginInfo || externalLoginInfo || authorizedTaskLoginInfo);
      return defer
         .then(_persistSyncData)
         .then(_cleanUserInfo)
         .then(sessions.start)
         .then(function(session) {
            return _regAppSession(session, runId, context);
         });
   }

   function registerApplicationSession(sessionId, runId, context) {
      if (!sessionId) {
         return _regAppSession(null, runId, context);
      }
      return sessions.get(sessionId).then(function(session) {
            if(!session.active){
               return _regAppSession(null, runId, context);
            }
            else {
               return usersDao.findById(session.userId).then(_cleanUserInfo).then(_addUserIntoSession);
            }


         function _addUserIntoSession(user) {
            session.user = user;
            return _regAppSession(session, runId, context);
         }
      },
      function(){
         return _regAppSession(null, runId, context);
      });
   }

   function _regAppSession(session, runId, context) {
      if (runId) {
         return dao.findById(runId).then(_resolveSession);
      }
      else {
         var applicationSession = new ApplicationSession(runId, session, context);
         var def = q.defer();
         def.resolve(applicationSession);
         return def.promise.then(_resolveSession);
      }

      function _resolveSession(applicationSession) {
         applicationSession.sessionId = (session || {})._id || '';
         applicationSession.userId = (session || {}).userId || '';
         return dao.save(applicationSession).then(_addUserIntoAppSession);

         function _addUserIntoAppSession(data) {
            applicationSession.user = (session || {}).user;
            applicationSession._id = data.id;
            return _cleanApplicationSession(applicationSession);
         }
      }
   }

   function performLogout(runId) {
      return dao.findById(runId).then(_terminateSession).then(_terminateApplSession);

      function _terminateSession(applicationSession) {
         return sessions.deactivate(applicationSession.sessionId).then(function() {
            return applicationSession;
         });
      }
   }

   function terminateApplicationSession(runId) {
      return dao.findById(runId).then(_terminateApplSession);
   }

   function _terminateApplSession(applicationSession) {
      applicationSession.endedAt = new Date();
      applicationSession.active = false;
      dao.save(applicationSession);
   }

   function _cleanApplicationSession(applicationSession) {
      applicationSession.runId = applicationSession._id;
      delete applicationSession._id;
      delete applicationSession._rev;
      return applicationSession;
   }

   function _cleanUserInfo(user) {
      user.id = user._id;
      user.userId = user._id;
      delete user._id;
      delete user.passwordSalt;
      delete user.passwordHash;
      delete user.passwordEncodingMethod;
      delete user._rev;

      return user;
   }

   function updateUserActivity(runId, online, activities) {
      var userId;
      var appSessionRes;
      return dao.findById(runId)
      .then(function onSave (applicationSession) {
         var prevActivities = [];
         var actualStatus = {
            actual : true,
            lastActive : Date.now()
         };
         userId = applicationSession.userId;
         if (applicationSession.status && applicationSession.status.activities) {
            prevActivities = _.map(applicationSession.status.activities, function (oldActivity) {
               oldActivity.actual = false;
               return oldActivity;
            });
         }
         _.each(activities, function (newActivity) {
            var sameActivity = _.find(prevActivities, function (oldActivity) {
               return isEqualActivities(oldActivity, newActivity);
            });
            if (!sameActivity) {
               prevActivities.push(_.extend(newActivity, actualStatus));
            }
            else {
               _.extend(sameActivity, actualStatus);
            }
         });
         applicationSession.status = {
            online : online,
            activities : prevActivities,
            lastStatusNotification : Date.now()
         };
         return dao.save(applicationSession);
      })
      .then(function getUserProfile (_appSessionRes) {
         appSessionRes = _appSessionRes;
         return usersDao.findById(userId);
      })
      .then(function getUserActiveStatus (_user) {
         return _.extend(appSessionRes, {
            user: {
               active: _user.active
            }
         });
      })
      .catch(function () {
         if ( appSessionRes ) {
            return appSessionRes;
         }
         else {
            return _onErr();
         }
      });
   }

   // make sure that validate data is present
   function _persistSyncData(user){
      return agentTools.persistSyncData(user)
         .then(function(user){
            // save user data with 'sync' field created/updated
            if(user.sync._update){
               agentTools.cleanup(user);
               return usersDao.save(user);
            }
            else{
               agentTools.cleanup(user);
               return q.resolve(user);
            }
         });
   }


   function applicationSessionsMonitor() {
      var _timeout = config.applicationSessionsMonitor.inactivityTimeout;
      logger.log(config.applicationSessionsMonitor.msgInvoked);

      dao.findActiveSessions()
      .then(function (response) {
         var _now = Date.now();
         var inactiveSessions = response
            .filter(function (row) {
               var _lastStatusNotification = row.value;
               return _now - _lastStatusNotification > _timeout;
            })
            .map(function (row) {
               row.doc.status.online = false;
               return row.doc;
            });
         return dao.saveMany(inactiveSessions);
      })
      .then(function (response) {
         var updatedSessionCount = 0;
         if (response.length) {
            updatedSessionCount = response.filter(function (row) {
               return _.has(row, 'ok');
            }).length;
            logger.log(config.applicationSessionsMonitor.msgTotal + ': ' + response.length);
            logger.log(config.applicationSessionsMonitor.msgSuccess + ': ' + updatedSessionCount);
         }
         else {
            logger.log(config.applicationSessionsMonitor.msgNotFound);
         }
      })
      .catch(function (err) {
         logger.err(err);
      });
   }

   function searchUsersWithActivity(activity, contextActivity, activeOnly) {
      var activityKey = _createKey(activity);
      var requests = [dao.findActivity(activityKey)];
      var contextActivityKey;

      if (contextActivity) {
         contextActivityKey = _createKey(contextActivity);
         requests.push(dao.findActivity(contextActivityKey));
      }
      return q.all(requests)
      .spread(function composeResult(activitySummaries, contextActivitySummaries) {
         var context = {};
         if (contextActivity) {
            context = contextActivitySummaries
               .map(function(row) {
                  return row.doc._id;
               })
               .reduce(function(context, id, index) {
                  context[id] = index;
                  return context;
               }, {});
         }
         return activitySummaries
            .filter(function(row) {
               var isInContext = !contextActivity || _.has(context, row.doc._id);
               var isActive = !activeOnly || row.value.online;
               return isInContext && isActive;
            })
            .map(_createUserActivityStatus);
      })
      .catch(_onErr);
   }

   function countUsersWithActivity (activity, activeOnly) {
      var activityKey = _createKey(activity);

      return dao.findActivity(activityKey)
      .then(function countActivities(response) {
         return response.filter(function(row) {
            return !activeOnly || row.value.online;
         }).length;
      })
      .catch(_onErr);
   }

   function _createUserActivityStatus(row) {
      var activity = {
         name              : row.key[0],
         relatedEntityId   : row.key[1]
      };
      var userProfileView = {
         userId            : row.doc._id,
         lastName          : row.doc.lastName,
         firstName         : row.doc.firstName,
         photo             : _.has(row.doc, 'photo') && row.doc.photo.fileHash //?
      };
      var userActivityStatus = {
         activity          : activity,
         actual            : row.value.online && row.value.actual,
         lastActive        : row.value.lastActive || row.value.lastOnline,
         user              : userProfileView
      };
      return userActivityStatus;
   }

   function _createKey (activity) {
      return [activity.name, activity.relatedEntityId];
   }

   function isEqualActivities (oldActivity, newActivity) {
      return oldActivity.relatedEntityId === newActivity.relatedEntityId && oldActivity.name === newActivity.name;
   }

   function _onErr (err) {
      var errMsg = err.description || err;
      return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
   }

   module.exports = {
      isAuth         : isAuth,
      getUserId      : getUserId,
      getUserData    : getUserData,
      getSessionId   : getSessionId,
      getSessionData : getSessionData,
      getUserSessionData : getUserSessionData,
      getAppSession  : getAppSession,

      performLogin                  : performLogin,
      performLogout                 : performLogout,
      registerApplicationSession    : registerApplicationSession,
      terminateApplicationSession   : terminateApplicationSession,
      updateUserActivity            : updateUserActivity,
      searchUsersWithActivity       : searchUsersWithActivity,
      countUsersWithActivity        : countUsersWithActivity
   };
})();
