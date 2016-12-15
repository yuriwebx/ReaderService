/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
   'use strict';
   var errorMessages = {
      emailRegistered : 'User with this e-mail "%s" has been already registered.',
      notFindUser     : 'User with this id not found.',
      taskNotFind     : 'Task "%s" not found by email "%s".',
      emailNotValid   : 'E-mail address has been already used.',
      emailNotFind    : 'E-mail address "%s" not found.',
      taskNotFindHash : 'Authentication task with hash code "%s" and view "%s" hasn\'t been found.'
   };
   var util           = require('util');
   var config         = require(__dirname + '/../utils/configReader.js');
   var encodingConfig = config.encodingConfig;
   var mail           = require('../mail/sendPasswordMailController.js');
   var _              = require('underscore');
   var utils          = require('../utils/utils.js');
   var db             = require('./dao/utils').findDB();
   var dao            = require('./dao/usersDao');
   var q              = require('q');
   var statistics     = require('./userstudystatistics.js');
   var logger         = require('../utils/logger.js').getLogger(__filename);

   var _db = {
      view   : q.nbind(db.view, db, 'Views'),
      get    : q.nbind(db.get, db),
      insert : q.nbind(db.insert, db)
   };

   function createUserProfileStatus (user) {
      return {
         hasExternalProfile   : user.externaluserid && user.externaluserid.length !== 0,
         hasPassword          : user.passwordHash && user.passwordHash.length !== 0,
         hasNotConfirmedEmail : user.emailConfirmationStatus === config.emailConfirmationStatus.notConfirmed
      };
   }

   var createPassword = {};

   createPassword[config.passwordPersistingModeEnum.withoutChanges] = function (profile) {
      profile.isValidPassword = true;
      return profile;
   };

   createPassword[config.passwordPersistingModeEnum.generateAutomatically] = function (profile) {
      profile.password = utils.getRandomString(encodingConfig.length);
      profile.passwordSalt = utils.getRandomString(16);
      profile.passwordHash = utils.getHash(profile.password, profile.passwordSalt, encodingConfig.method);
      profile.passwordEncodingMethod = encodingConfig.method;
      profile.isValidPassword = true;
      return profile;
   };

   createPassword[config.passwordPersistingModeEnum.setNew] = function (profile, profilePersistingInfo) {
      profile.passwordSalt = profile.passwordSalt ? profile.passwordSalt : utils.getRandomString(16);
      var confirmHash = utils.getHash(profilePersistingInfo.passwordConfirmation, profile.passwordSalt, encodingConfig.method);
      if ( profile.passwordHash === confirmHash || profilePersistingInfo.newUser || profile.passwordHash === undefined ) {
         profile.password = profilePersistingInfo.newPassword;
         profile.passwordSalt = utils.getRandomString(16);
         profile.passwordHash = utils.getHash(profile.password, profile.passwordSalt, encodingConfig.method);
         profile.passwordEncodingMethod = encodingConfig.method;
         profile.isValidPassword = true;
      }
      else {
         profile.isValidPassword = false;
      }
      return profile;
   };

   function getPassword(profile, profilePersistingInfo) {
      profile = createPassword[profilePersistingInfo.passwordPersistingModeEnum](profile, profilePersistingInfo);
      return profile;
   }

   function changePassword(user, password, defer) {
      var data = _.extend(user, {
         password: password,
         passwordSalt: utils.getRandomString(16),
         passwordEncodingMethod: encodingConfig.method
      });
      data.passwordHash = utils.getHash(data.password, data.passwordSalt, encodingConfig.method);
      var reason = {};
      delete data.password;
      dao.save(data).then(
         function () {
            logger.info('changePassword ' + user.id + ' businessFunctionStatus ' + config.businessFunctionStatus.ok);
            defer.resolve({
               status: config.businessFunctionStatus.ok
            });
         }, function (err) {
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      );
   }

   function createNewUser(profile, profilePersistingInfo, language, _currentUser) {
      var defer = q.defer();
      delete profile.newUser;
      profile.registeredAt = new Date().toString();
      profile = getPassword(profile, profilePersistingInfo);
      profile.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByAdmin;
      profile.externaluserid = [];
      if ( profile.isValidPassword ) {
         delete profile.isValidPassword;
         var password = profile.password;
         var options = {
            link: config.buildURL
         };
         dao.save(profile).then(function () {
            mail.sendPassword(profile, password, true, language, options).then(function () {
               logger.info('updatedUser ' + profile.id + ' businessFunctionStatus ' + config.businessFunctionStatus.ok);
               defer.resolve({
                  status: config.businessFunctionStatus.ok
               });
            }, defer.reject);
         }, defer.reject);
      }
      else {
         defer.resolve({
            status: config.businessFunctionStatus.error,
            text: 'Password confirmation failed.'
         });
      }
      return defer.promise;
   }

   function updatedUser(profile, profilePersistingInfo, language, _currentUser) {
      var defer = q.defer(),
         reason = {};
      db.get(profile.id, {revs_info: true}, function (err, body) {
         if ( !err ) {
            delete profile.id;
            if ( _currentUser.adminRole ) {
               profile.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByAdmin;
            }
            else {
               delete profile.email;
            }
            profile = _.defaults(profile, body);
            profile = getPassword(profile, profilePersistingInfo);
            var resetPassword = profilePersistingInfo.passwordPersistingModeEnum === config.passwordPersistingModeEnum.generateAutomatically;
            var newPassword = profile.password;
            profile.modifiedAt = new Date().toString();
            if ( profile.isValidPassword ) {
               dao.save(profile).then(
                  function () {
                     if ( resetPassword ) {
                        mail.sendPassword(profile, newPassword, false, language).then(function () {
                           logger.info('resetPassword ' + profile.id + ' businessFunctionStatus ' + config.businessFunctionStatus.ok);
                           defer.resolve({
                              status: config.businessFunctionStatus.ok
                           });
                        }, defer.reject);
                     }
                     else {
                        logger.info('updatedUser ' + profile.id + ' businessFunctionStatus ' + config.businessFunctionStatus.ok);
                        defer.resolve({
                           status: config.businessFunctionStatus.ok
                        });
                     }
                  },
                  function () {
                     reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                     defer.reject(reason);
                  }
               );
            }
            else {
               defer.resolve({
                  status: config.businessFunctionStatus.error,
                  text: 'Password confirmation failed.'
               });
            }
         }
         else {
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      });
      return defer.promise;
   }

   function updateNotActiveUser(profileObject, defer) {
      var taskType = config.authenticationTaskType.registerUserProfile, user;
      var reason = {}, message = '';
      db.view('Views', 'emailtaskByEmail', {
         key: [profileObject.email, taskType],
         include_docs: true
      }, function (err, body) {
         if ( err ) {
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else if ( body.rows.length !== 0 ) {
            var task = body.rows[0].doc;
            db.get(task.userId, {revs_info: true}, function (err, body) {
               if ( err ) {
                  reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                  defer.reject(reason);
               }
               else if ( body ) {
                  user = _.defaults(profileObject, body);
                  if ( user.active === 'Registered' && task.status === config.authenticationTaskStatus.register ) {
                     delete user.newUser;
                     delete user.url;
                     dao.save(user, true).then(defer.resolve, defer.reject);
                  }
                  else {
                     message = util.format(errorMessages.emailRegistered, profileObject.email);
                     defer.reject({
                        message: message
                     });
                  }
               }
               else {
                  message = errorMessages.notFindUser;
                  reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
                  defer.reject(reason);
               }
            });
         }
         else {
            message = util.format(errorMessages.taskNotFind, taskType, profileObject.email);
            reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      });
   }

   function updateTaskStatus(id) {
      var defer = q.defer();
      var reason = {};
      db.view('Views', 'emailtaskByUserId', {key: id, include_docs: true}, function (err, body) {
         if ( err ) {
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else if ( body.rows.length !== 0 ) {
            var tasks = [];
            var date = new Date().getTime();
            var setConfirmedEmail = false;

            body.rows.map(function (_row) {
               if ( _row.doc.expiredAt < date && _row.doc.status === config.authenticationTaskStatus.register ) {
                  _row.doc.status = config.authenticationTaskStatus.expired;
                  if ( _row.doc.taskType === config.authenticationTaskType.confirmNewEmail ) {
                     setConfirmedEmail = true;
                  }
               }
               tasks.push(_row.doc);
            });

            db.bulk({docs: tasks}, function (error) {
               if ( error ) {
                  reason = utils.addSeverityResponse(error, config.businessFunctionStatus.error);
                  defer.reject(reason);
               }
               else {
                  if ( setConfirmedEmail ) {
                     db.get(id, function (err, body) {
                        if ( err ) {
                           reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                           defer.reject(reason);
                        }
                        else {
                           body.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByUser;
                           dao.save(body).then(function () {
                              defer.resolve({});
                           }, defer.reject);
                        }
                     });
                  }
                  else {
                     defer.resolve({});
                  }
               }
            });
         }
         else {
            defer.resolve({});
         }
      });
      return defer.promise;
   }

   var getCurrentUser = function (uid) {
      var defer = q.defer(),
         reason = {};
      db.get(uid, function (err, user) {
         if ( err ) {
            reason = utils.addSeverityResponse(err.description + ' in function getCurrentUser manageUsers', config.businessFunctionStatus.error);
            defer.reject(reason);
         }
         else if ( user ) {
            defer.resolve(user);
         }
         else {
            reason = utils.addSeverityResponse('User has not found in function getCurrentUser manageUsers', config.businessFunctionStatus.error);
            defer.reject(reason);
         }
      });
      return defer.promise;
   };


   var defereDBFetch = q.nbind(db.fetch, db);

   function createUserProfileView(user) {
      return {
         userId: user._id,
         firstName: user.firstName,
         lastName: user.lastName,
         photo: _.has(user, 'photo') ? user.photo.fileHash || user.photo : ''
      };
   }

   function getUserProfiles(ids) {
      var query = {
         keys: ids,
         include_docs: true
      };
      return defereDBFetch(query)
         .spread(function (body) {
            var users = _.map(body.rows, function (user) {
               return user.doc;
            });
            return users;
         })
         .catch(function (err) {
            return q.reject(err);
         });
   }

   module.exports = {
      createUserProfileView: createUserProfileView,
      getUserProfiles: getUserProfiles,
      confirmUserAccess: function (userId, adminId, confirm) {
         var userProfile  = {};
         var adminProfile = {};
         var viewName     = "usersByUserId";
         var options      = {
            link: config.buildURL
         };
         return _db.view(viewName, {
            keys      : [userId, adminId],
            revs_info : true
         })
         .spread(function setUserActiveStatus (response) {
            response = response && response.rows;
            userProfile = response[0].value;
            adminProfile = response[1].value;
            userProfile.active = confirm ? 'Approved' : 'Declined';
            return _db.insert(userProfile);
         })
         .spread(function () {
            if ( !userProfile.email.length ) {
               return { status: userProfile.active };
            }
            var senderProfile = {
               firstName : adminProfile.firstName,
               lastName  : adminProfile.lastName,
               email     : adminProfile.email
            };
            if ( userProfile.active === 'Approved' ) {
               return mail.sendAdminAcceptance(userProfile, senderProfile, 'en', options);
            }
            else {
               return mail.sendAdminDecline(userProfile, senderProfile, 'en');
            }
         })
         .catch(function(err) {
            throw err;
         });
      },
      searchUsers: function (obj) {
         var defer = q.defer();
         var reason = {};
         obj.itemsCount = parseInt(obj.itemsCount);
         obj.include_docs = true;
         utils.isValid(obj, 'searchUsers').then(function () {
            db.view_with_list('Views', 'users' + obj.category.replace(' ', ''), 'usersSearch', obj, function (err, result) {
               if ( !err ) {
                  defer.resolve({
                     totalResults: result.length,
                     result: result
                  });
               }
               else {
                  reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                  defer.reject(reason);
               }
            });
         });
         return defer.promise;
      },
      getUserProfile: function (id) {
         var userProfileState = {};
         return utils.isValid(id, 'getUserProfile').then(function () {
            return updateTaskStatus(id);
         })
            .thenResolve(getUserProfiles([id]))
            .then(function (users) {
               var user = _.first(users);
               userProfileState.userProfileInfo = {
                  id: user._id,
                  email: user.email,
                  lastName: user.lastName,
                  firstName: user.firstName,
                  editorRole: user.editorRole,
                  adminRole: user.adminRole,
                  active: user.active,
                  photo: (user.hasOwnProperty('photo')) ? user.photo.fileHash || user.photo : ''
               };
               userProfileState.userProfileStatus = createUserProfileStatus(user);
               return statistics.getUserStatisticsByUid(id);
            })
            .then(function (stats) {
               userProfileState.userStudyStatistics = stats;
               return userProfileState;
            })
            .catch(function (err) {
               return q.reject(err);
            });
      },
      getUser: getCurrentUser,
      persistUserProfile: function (uid, profile, profilePersistingInfo) {
         var language = 'en',
            _currentUser = {};
         profile = utils.stringToBoolean(profile);
         profile.photo = utils.getPhotoObj(profile);

         return utils.isValid(profile, 'persistUserProfile').then(function () {
            return getCurrentUser(uid);
         })
            .then(function (user) {
               _currentUser = user;
               return utils.validateEmail(profile.email, profile.id);
            })
            .then(function (unique) {
               if ( profilePersistingInfo.newUser && unique ) {
                  return createNewUser(profile, profilePersistingInfo, language, _currentUser);
               }
               else if ( unique ) {
                  return updatedUser(profile, profilePersistingInfo, language, _currentUser);
               }
               else {
                  return {emailAlredyIsUsed: true};
               }
            });
      },
      updatePersonalProfile: function (profileObject) {
         var defer = q.defer();
         utils.isValid(profileObject, 'updatePersonalProfile').then(function () {
            utils.validateEmail(profileObject.email, profileObject.id).then(function () {
               profileObject.photo = utils.getPhotoObj(profileObject);
               db.get(profileObject.id, {
                  revs_info: true
               }, function (err, body) {
                  if ( !err ) {
                     profileObject = _.defaults(profileObject, body);
                     profileObject.updatedOn = new Date().toString();
                     dao.save(profileObject).then(function () {
                        defer.resolve({});
                     }, defer.reject);
                  }

               });
            }, defer.reject);
         }, defer.reject);
         return defer.promise;
      },
      updateUserStatistic: function (profileObject) {
         var defer = q.defer();
         var reason = {};
         db.get(profileObject._id, {
            revs_info: true
         }, function (err, body) {
            if ( !err ) {
               profileObject = _.extend(body, profileObject);
               profileObject.updatedOn = new Date().toString();
               dao.save(profileObject).then(function () {
                  defer.resolve({});
               }, defer.reject);

            }
            else {
               reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
         });
         return defer.promise;
      },
      userRegistration: function (profileObject) {
         var defer = q.defer();
         profileObject = _.extend(profileObject, {
            email                   : profileObject.email.toLowerCase(),
            editorRole              : false,
            adminRole               : false,
            active                  : config.userAccessStatusEnum.registered,
            newUser                 : true,
            registeredAt            : new Date().toString(),
            passwordSalt            : utils.getRandomString(16),
            passwordEncodingMethod  : encodingConfig.method,
            emailConfirmationStatus : config.emailConfirmationStatus.notConfirmed,
            externaluserid          : []
         });

         profileObject.passwordHash = utils.getHash(profileObject.password, profileObject.passwordSalt, encodingConfig.method);
         utils.isValid(profileObject, 'persistUserProfile').then(function () {
            utils.validateEmail(profileObject.email).then(function (unique) {
               delete profileObject.password;
               delete profileObject.confirm;
               if ( unique ) {
                  delete profileObject.newUser;
                  delete profileObject.url;
                  dao.save(profileObject, true).then(defer.resolve, defer.reject);
               }
               else {
                  updateNotActiveUser(profileObject, defer);
               }
            }, defer.reject);
         }, defer.reject);
         return defer.promise;
      },
      resertPassword: function (password, taskConfirmationHashCode, taskHashCode) {
         var defer = q.defer();
         var viewUsed = taskConfirmationHashCode ? 'emailtaskByConfirmationHashCode' : 'emailtaskByTaskHashCode';
         var hashCode = taskConfirmationHashCode ? taskConfirmationHashCode : taskHashCode;
         var reason = {}, message = '';
         db.view('Views', viewUsed, {key: hashCode, include_docs: true}, function (err, body) {
            if ( err ) {
               reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
            else if ( body.rows.length !== 0 ) {
               var task = body.rows[0].doc;
               db.view('Views', 'usersByEmail', {
                  keys: [task.email.toLowerCase()],
                  include_docs: true
               }, function (err, body) {
                  if ( err ) {
                     reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                     defer.reject(reason);
                  }
                  else if ( body.rows.length !== 0 ) {
                     var user = body.rows[0].doc;
                     changePassword(user, password, defer);
                  }
                  else {
                     message = util.format(errorMessages.emailNotFind, task.email);
                     reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
                     defer.reject(reason);
                  }
               });

            }
            else {
               message = util.format(errorMessages.taskNotFindHash, hashCode, viewUsed);
               reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
         });
         return defer.promise;
      },
      changePassword: function (uid, oldPassword, newPassword) {
         newPassword = newPassword || '';
         oldPassword = oldPassword || '';
         var defer = q.defer();
         var reason = {};
         db.get(uid, {revs_info: true}, function (err, body) {
            if ( err ) {
               reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               defer.reject(reason);
            }
            else {
               var confirmHash = utils.getHash(oldPassword, body.passwordSalt, encodingConfig.method);
               if ( body.passwordHash === confirmHash ) {
                  changePassword(body, newPassword, defer);
               }
            }
         });
         return defer.promise;
      },
      getFile: function (fileId) {
         var defer = q.defer();
         utils.getFile(fileId).then(function (file) {
            defer.resolve(file);
         }, defer.reject);
         return defer.promise;
      },
      deleteUser: function (userId) {
         var update = [], deferred = q.defer();
         db.view('Views', 'userGetAllRelatedData', {key: userId}, function (err, data) {
            if ( !err && data && data.rows && data.rows.length ) {
               var studyguides = [];
               _.each(data.rows, function (el) {
                  update.push({
                     _id: el.id,
                     _rev: el.value.rev,
                     _deleted: true
                  });
                  if ( el.value.type === 'StudyGuide' ) {
                     studyguides.push(el.id);
                  }
               });
               db.bulk({docs: update}, function (err) {
                  if ( err ) {
                     logger.error(err);
                     deferred.reject();
                  }
                  else {
                     if ( studyguides.length ) {
                        db.view('Views', 'materialsForStudyGuideAll', {keys: studyguides}, function (err, data) {
                           if ( err ) {
                              logger.error(err);
                              deferred.reject();
                           }
                           else {
                              if ( data.rows && data.rows.length ) {
                                 var toDel = [];
                                 _.each(data.rows, function (el) {
                                    toDel.push({_id: el.id, _rev: el.value.rev, _deleted: true});
                                 });
                                 db.bulk({docs: toDel}, function (err) {
                                    if ( err ) {
                                       logger.error(err);
                                    }
                                    deferred.resolve();
                                 });
                              }
                              else {
                                 deferred.resolve();
                              }
                           }
                        });
                     }
                     else {
                        deferred.resolve();
                     }
                  }
               });
            }
            else {
               deferred.reject();
            }
         });
         return deferred.promise;
      }
   };
}());