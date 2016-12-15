define([
      'module',
      'swServiceFactory',
      'underscore',
      'Context',
      'swLoggerFactory',
      'ClientNodeContext',
      'ApplicationContext',
      'ExecutionContext'
   ],
   function (module, swServiceFactory, _, Context, swLoggerFactory, ClientNodeContext, ApplicationContext, ExecutionContext) {
      'use strict';

      swServiceFactory.create({
         module: module,
         service: [
            '$q',
            'swSubmachine',
            '$window',
            '$timeout',
            'swUnifiedSettingsService',
            'swRestService',
            'swAgentService',
            'swOfflineModeService',
            function (
               $q,
               swSubmachine,
               $window,
               $timeout,
               swUnifiedSettingsService,
               swRestService,
               swAgentService,
               swOfflineModeService) {

               /* --- api --- */
               this.bootstrapApplication        = bootstrapApplication;
               this.isLoggedOut                 = isLoggedOut;
               this.init                        = _init;
               this.isAuthenticated             = isAuthenticated;
               this.getUser                     = getUser;
               this.getUserId                   = getUserId;
               this.getUserSID                  = getUserSID;
               this.getRunId                    = getRunId;
               this.getOAuthUri                 = getOAuthUri;
               this.authenticate                = authenticate;
               this.getUserPhoto                = getUserPhoto;
               this.clearLocalStorage           = clearLocalStorage;
               this.getUserProfileState         = getUserProfileState;
               this.persistUserProfile          = persistUserProfile;
               this.logout                      = logout;
               this.registerUserProfile         = registerUserProfile;
               this.changePassword              = changePassword;
               this.resetPassword               = resetPassword;
               this.registerEmailAuthorizedTask = registerEmailAuthorizedTask;
               this.confirmAuthorizedTask       = confirmAuthorizedTask;
               this.checkStatusOfAuthorizedTask = checkStatusOfAuthorizedTask;
               this.validatePassword            = validatePassword;
               this.goLibraryContentEditor      = goLibraryContentEditor;

               var logger = swLoggerFactory.getLogger(module.id);

               var _isAuthenticated = false;
               var _inprocess = false;
               var user = {};
               var runId;

               function _onAuth (_sid, _user) {
                  if ( _sid && _user && _.has(_user, 'userId') ) {
                     user = _user;
                     _isAuthenticated = true;

                     if ( user.sync ) {
                        swAgentService.setCredentials(user);
                     }

                     var sessionGroup = swUnifiedSettingsService.getGroup('session');
                     sessionGroup.set('profile', user);
                     sessionGroup.set('SID', _sid);
                     sessionGroup.save();
                  }
               }

               function getUserSID () {
                  return swUnifiedSettingsService.getSetting('session', 'SID');
               }

               function _init () {
                  _onAuth(getUserSID(), swUnifiedSettingsService.getSetting('session', 'profile'));
               }

               function isAuthenticated () {
                  return _isAuthenticated;
               }

               function isLoggedOut() {
                  return !_inprocess && !_isAuthenticated;
               }

               function getUser () {
                  return user;
               }

               function getUserId () {
                  return user.userId || false;
               }

               function getOAuthUri (providerName) {
                  var serverUrl = Context.serverUrl,
                     oauthPath = Context.parameters.EpubConfig.oauthPath;

                  return (
                     serverUrl +
                     oauthPath +
                     (oauthPath.indexOf('?') > -1 ? '&' : '?') +
                     ['provider=' + providerName, 'returnURI=' + encodeURIComponent($window.location.href)].join('&')
                     );
               }

               function authenticate (userInfo, authType) {
                  var defer = $q.defer();
                  var configInfo = Context.parameters;
                  var authResult = {status: '', message: ''};

                  userInfo.configInfo = {
                     environmentSuffix: configInfo.environmentSuffix || '',
                     environmentPrefix: configInfo.environmentPrefix || '',
                     buildID: configInfo.buildID || '',
                     revision: configInfo.revision || '',
                     processorCommit: configInfo.rrmProcessor ? configInfo.rrmProcessor.commitID : '',
                     sourcesCommit: configInfo.rrmOcean ? configInfo.rrmOcean.commitID : '',
                     appCommit: configInfo.reader ? configInfo.reader.commitID : ''
                  };

                  //TODO ARNI: remove obsolete code
                  swRestService.restRequest('post', 'Session', authType, userInfo).success(function (response) {
                     if ( response && response.sessionId ) {
                        _onAuth(response.sessionId, response.user);
                        authResult.status = response.user.active === 'Approved' ? 'loggedIn' : 'pendingLogIn';
                        defer.resolve(authResult);
                     }
                     else {
                        authResult.status = 'error';
                        authResult.message = response.text || 'Error authenticating user';
                        defer.resolve(authResult);
                     }
                  }, function () {
                     logger.debug('Error authenticating user');
                     authResult.status = 'error';
                     authResult.message = 'Error authenticating user';
                     defer.resolve(authResult);
                  });

                  return defer.promise;
               }

               function clearLocalStorage () {
                  _isAuthenticated = false;
                  var sessionGroup = swUnifiedSettingsService.getGroup('session');
                  sessionGroup.set('profile', null);
                  sessionGroup.set('SID', null);
                  sessionGroup.save();
               }

               function getUserPhoto (fileId) {
                  var url = swRestService.getUrlString('Users', 'getFile').split('?RunId=')[0];
                  url += '?fileId=' + fileId;
                  return url;
               }

               function getUserProfileState (id) {
                  return swAgentService.request('get', 'Users', 'profile', {id: id}).then(_resolveFilter, _rejectFilter);

                  function _resolveFilter(result) {
                     if(typeof result.data.userProfileInfo.active === 'boolean'){ // TODO remove this code after a while
                        result.data.userProfileInfo.active = result.data.userProfileInfo.active ? 'Approved' : 'Registered';
                     }
                     result.data.userProfileInfo.isPhoto = false;
                     if ( result.data.userProfileInfo.hasOwnProperty('photo') && (result.data.userProfileInfo.photo.length > 0) ) {
                        result.data.userProfileInfo.photoLink = getUserPhoto(result.data.userProfileInfo.photo);
                        result.data.userProfileInfo.isPhoto = true;
                     }
                     return result.data;
                  }

                  function _rejectFilter(reason) {
                     if ( reason.status !== 0 ) {
                        return $q.reject(reason);
                     }
                  }
               }

               var _self = this;

               function persistUserProfile (profile, profilePersistingInfo) {
                  var deferred = $q.defer();
                  var results = [];
                  profile.userId = profile.id;
                  var params = {
                     profile: profile,
                     profilePersistingInfo: profilePersistingInfo
                  };

                  swRestService.restSwHttpRequest('post', 'Users', 'persistuserprofile', params)
                     .then(function (result) {
                        swAgentService.request('post', 'Users', 'update', profile, null, 'noop');
                        results.push(result.data);
                        if ( result.data.emailAlredyIsUsed ) {
                           deferred.resolve(result.data);
                        }
                        else if ( !profilePersistingInfo.newUser ) {
                           _self.getUserProfileState(profile.id).then(function (oldProfileState) {
                              var oldProfile = oldProfileState.userProfileInfo;
                              if ( profile.email && profile.email !== oldProfile.email && profilePersistingInfo.changeEmail ) {
                                 _self.registerEmailAuthorizedTask(profile.email, 'ConfirmNewEmail', undefined, profile.id).then(function (result) {
                                    if ( result.data.status === 'OK' ) {
                                       result.data.data.status = 'TaskRegistered';
                                    }
                                    results.push(result.data);
                                    deferred.resolve(results);
                                 });
                              }
                              else {
                                 deferred.resolve(results);
                              }
                           });
                        }
                        else {
                           deferred.resolve(results);
                        }
                     },
                     function (reason) {
                        deferred.reject(reason && reason.data);
                     });
                  return deferred.promise;
               }

               function logout () {
                  var defer = $q.defer();
                  if ( _isAuthenticated ) {
                     swRestService.restRequest('delete', 'Session', {SID: getUserSID()}).success(function () {
                        swAgentService.syncUserData();
                        clearLocalStorage();
                        $timeout(function() {
                           defer.resolve({status: 'loggedOut'});
                        }, 1000);
                     }, function () {
                        logger.debug('Error unauthenticating user');
                        defer.resolve({status: 'error', message: 'Error unauthenticating user'});
                     });
                  }
                  return defer.promise;
               }

               function registerUserProfile (profile) {
                  var defer = $q.defer();
                  swRestService.restSwHttpRequest('post', 'Users', 'userregistration', profile).then(function (result) {
                     if ( result.data.status === 'OK' ) {
                        var userEmail = profile.email;
                        var taskType = 'RegisterUserProfile';
                        var password;
                        defer.resolve(_self.registerEmailAuthorizedTask(userEmail, taskType, password));
                     }
                     else {
                        defer.resolve(result);
                     }
                  }, function (reason) {
                     defer.reject(reason);
                  });
                  return defer.promise;
               }

               //no clients
               function changePassword (oldPassword, newPassword, userId) {
                  var changePasswordParams = {
                     uid: userId,
                     oldPassword: oldPassword,
                     newPassword: newPassword
                  };
                  return swRestService.restSwHttpRequest('post', 'Users', 'changepassword', changePasswordParams);
               }

               function resetPassword (password, taskConfirmationHashCode, taskHashCode) {
                  var resertParams = {
                     password: password,
                     taskConfirmationHashCode: taskConfirmationHashCode,
                     taskHashCode: taskHashCode
                  };
                  return swRestService.restSwHttpRequest('post', 'Users', 'resetpassword', resertParams);
               }

               //task functions
               function registerEmailAuthorizedTask (userEmail, taskType, password, userId) {
                  var application = Context.serverUrl.indexOf('localhost') !== -1 ?
                     ApplicationContext.application.toLowerCase() + '/index.html' : ApplicationContext.application.toLowerCase() + '/';
                  var applicationUrl = Context.serverUrl + application + '#';
                  var registerParams = {
                     userEmail: userEmail,
                     taskType: taskType,
                     applicationUrl: applicationUrl,
                     uid: userId,
                     password: password
                  };
                  return swRestService.restSwHttpRequest('post', 'Users', 'registeremail', registerParams);
               }

                function confirmAuthorizedTask (taskConfirmationHashCode, confirm) {
                  var confirmParams = {
                     taskConfirmationHashCode: taskConfirmationHashCode,
                     confirm: confirm
                  };
                  return swRestService.restSwHttpRequest('post', 'Users', 'confirm', confirmParams);
               }

               //no clients
               function checkStatusOfAuthorizedTask (taskHashCode) {
                  var checkParams = {taskHashCode: taskHashCode};
                  return swRestService.restSwHttpRequest('post', 'Users', 'checkstatus', checkParams);
               }

               function validatePassword (password) {
                  return password.indexOf(' ') === -1 && password.length <= 50 && password.length !== 0;
               }

               function goLibraryContentEditor () {
                  var serverUrl = Context.serverUrl,
                     appUrl = Context.applicationUrl.replace(serverUrl, ''),
                     url;

                  if ( appUrl.indexOf('admin') > -1 ) {
                     appUrl = appUrl.replace('admin', 'editor');
                  }
                  else if ( appUrl.indexOf('reader') > -1 ) {
                     appUrl = appUrl.replace('reader', 'editor');
                  }
                  else {
                     return false;
                  }

                  url = serverUrl + appUrl;
                  $window.open(url);
               }

               function bootstrapApplication () {
                  var data = {
                     clientNodeContext: ClientNodeContext,
                     applicationContext: ApplicationContext,
                     executionContext: ExecutionContext,
                     SID: getUserSID()
                  };
                  _inprocess = true;
                  return swRestService.restSwHttpRequest('post', 'ApplicationSession', data).then(function (result) {
                     var applicationSession = result.data;
                     runId = applicationSession.runId;
                     _inprocess = false;

                     swRestService.addRunId(runId);
                     if ( !applicationSession.sessionId ) {
                        clearLocalStorage();
                     }
                     _onAuth(applicationSession.sessionId, applicationSession.user);
                     swUnifiedSettingsService.updateGroups(applicationSession.parameters);
                  });
               }

               swOfflineModeService.addOnlineModeChangeListener(function (online) {
                  if ( online ) {
                     bootstrapApplication()['finally'](function () {
                        if ( !_isAuthenticated ) {
                           swSubmachine.getStack()[0].submachine.go('Login');
                        }
                     });
                  }
               });

               function getRunId() {
                  return runId;
               }
            }]
      });
   });

