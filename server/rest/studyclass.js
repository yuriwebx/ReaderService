/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
   'use strict';
   var errorMessages = {
      studyClassNotFound   : 'Study class not found by id %s.',
      userRoleNotFound     : 'User role has not found for persist student status by user id',
      studentNotFound      : 'Student has not found for persist student status by student id',
      studentsViewNotFound : 'Student has not found for student view.',
      actionTypeNotFound   : 'Action type has not found for set status %s by %s.',
      usersNotFound        : 'User has noy found for invite in study class.',
      classNotFound        : 'Study class has not found for invate students by id',
      userActionsNotFound  : 'User actions has not found.'
   };
   var util         = require('util');
   var config       = require(__dirname + '/../utils/configReader.js');
   var robotStudent = require(__dirname + '/../serverScripts/robotStudent.js');
   var logger       = require(__dirname + '/../utils/logger.js').getLogger(__filename);

   var q = require('q');
   var _ = require('underscore');

   var utils            = require('../utils/utils.js');
   var publication      = require('./publication.js');
   var studyCourses     = require('./studyCourses.js');
   var inviteController = require('./invite.js');
   var manageUsers      = require('./manageUsers.js');
   var userPublications = require('./userpublications.js');
   var personalMessage  = require('./personalMessage');
   var userStudy        = require('./userstudy');
   var discussion       = require('./discussion');

   var db = require('./dao/utils').findDB();

   var DBtype = 'StudyClass',
       roleStudent           = config.studyProjectConfig.userRoleInStudyClass.student,
       roleTeacher           = config.studyProjectConfig.userRoleInStudyClass.teacher,
       roleTeacherAndStudent = config.studyProjectConfig.userRoleInStudyClass.teacherAndStudent,
       acceptedStatus        = config.studyProjectConfig.membershipStatus.accepted,
       declinedStatus        = config.studyProjectConfig.membershipStatus.declined,
       blockedStatus        = config.studyProjectConfig.membershipStatus.blocked,
       requestedStatus       = config.studyProjectConfig.membershipStatus.requested,
       createdByTeacher      = config.studyProjectConfig.classTeacherActionTypeEnum.classWasCreatedByTeacher,
       teacherWasAdded       = config.studyProjectConfig.classTeacherActionTypeEnum.teacherWasAddedToClass,
       teacherWasRemoved     = config.studyProjectConfig.classTeacherActionTypeEnum.teacherWasRemovedFromClass,
       classActive           = config.studyProjectConfig.studyClassStatus.active,
       classCancelled        = config.studyProjectConfig.studyClassStatus.cancelled,
       typeTeacher           = 'ClassTeacher',
       typeStudent           = 'ClassStudent',
       typeStudyClass        = 'StudyClass';

   var teacherFields = ['_id', 'email', 'lastName', 'firstName', 'photo'];
   var stripTeacherData = function (item) {
      var teacher = _.pick(item.doc, teacherFields),
          teacherAction = item.value.classTeacherAction && item.value.classTeacherAction[0].actionType,
          role = (teacherAction === createdByTeacher || !teacherAction) ? roleTeacher : roleTeacherAndStudent;

      teacher = _.extend(teacher, {
         userId : teacher._id,
         role   : role
      });
      delete teacher._id;
      return teacher;
   };

   var _db = {
      fetch   : q.nbind(db.fetch, db),
      view    : q.nbind(db.view, db, 'Views'),
      get     : q.nbind(db.get, db),
      insert  : q.nbind(db.insert, db),
      bulk    : q.nbind(db.bulk, db)
   };

   var deleteFields = function (data, fields) {
      _.each(fields, function (field) {
         delete data[field];
      });
   };

   var dbResult = function (deferred, callback) {
      return function (err, body) {
         var response;
         if (!err) {
            response = typeof callback === 'function' ? callback(body) : body;
            deferred.resolve(response);
         }
         else {
            response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
      };
   };

   var insertStudyClass = function (params) {
      var deferred = q.defer();
      db.insert(params, dbResult(deferred));
      return deferred.promise;
   };

   var dbget = function (studyClassId) {
      var deferred = q.defer();
      db.get(studyClassId, {revs_info: true}, dbResult(deferred));
      return deferred.promise;
   };

   var bulkInsert = function (arrayOfObjects) {
      var deferred = q.defer();
      db.bulk({
         docs: arrayOfObjects
      }, dbResult(deferred, function () {
         return {status: config.businessFunctionStatus.ok};
      }));
      return deferred.promise;
   };

   var getClassView = function (classId) {
      var deferred = q.defer();
      var response = {}, classView = {students: {}, class: {}, teacher: {}};
      var dbQueryParams = {include_docs: true, startkey: [classId, 0], endkey: [classId, 2, {}]};
      db.view('Views', 'studyclassById', dbQueryParams, function (err, participants) {
         if (err) {
            response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
         else {
            _.each(participants.rows, function (participant) {
               if (participant.doc.type === typeStudent) {
                  classView.students[participant.doc.studentId] = participant.doc;
               }
               else if (participant.doc.type === typeStudyClass) {
                  classView.class = participant.doc;
               }
               else if (participant.doc.type === typeTeacher) {
                  classView.teacher[participant.doc.teacherId] = participant.doc;
               }
            });
            deferred.resolve(classView);
         }
      });
      return deferred.promise;
   };

   var convertToUniform = function (publication) {
      return {
         _id: publication._id,
         bookId: publication.bookId,
         author: publication.author,
         category: publication.category,
         description: publication.description,
         difficulty: publication.difficulty,
         name: publication.name,
         readingTime: publication.readingTime,
         type: publication.type,
         cover: publication.cover,
         wordsCount: publication.wordsCount,
         audio: publication.audio,
         mediaSize: publication.mediaSize,
         bookAuthor: publication.bookAuthor,
         bookCover: publication.bookCover,
         bookName: publication.bookName
      };
   };

   var getPublicationView = function (runId, uid, publicationId) {
      var deferred = q.defer();
      var response = {};
      studyCourses.getStudyCourse(publicationId).then(function (extendedStudyCourse) {
         if (extendedStudyCourse && typeof extendedStudyCourse === 'object' && Object.keys(extendedStudyCourse).length) {
            response.studyCourseInfo = {};
            response.studyCourseInfo.details = extendedStudyCourse.studyCourseItems || extendedStudyCourse.details;
            delete extendedStudyCourse.studyCourseItems;
            extendedStudyCourse = extendedStudyCourse.type === 'StudyCourse' ? extendedStudyCourse : convertToUniform(extendedStudyCourse);
            response.studyCourseInfo.course = extendedStudyCourse;

            deferred.resolve(response);
         }
         else {
            deferred.reject(utils.addSeverityResponse('Publication has not found in BF getPublicationView.', config.businessFunctionStatus.error));
         }
      }).fail(deferred.reject);
      return deferred.promise;
   };

   function getStudyClassInfo(runId, uid, classId) { //TODO remove runIds
      var deferred = q.defer();
      var response = {
         teachers: [],
         userRole: undefined,
         summary: {
            numberOfStudents: 0,
            numberOfInvitedStudents: 0,
            numberOfRequestedStudents: 0
         },
         class: {}
      };
      db.view('Views', 'studyclassInfoByClassId', { keys: [classId], include_docs: true}, function (err, classMembers) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description + ' in BF study class info.', config.businessFunctionStatus.error));
         }
         else if (classMembers && classMembers.rows) {
            _.each(classMembers.rows, function (item) {
               if (item.doc.type === 'UserProfile') {
                  response.userRole = item.doc._id === uid ? config.studyProjectConfig.userRoleInStudyClass.teacher : response.userRole;
                  response.teachers.push(stripTeacherData(item));
               }
               else if (item.doc.type === typeStudyClass) {//*
                  response.class = item.doc;
               }
               else if (item.doc.studentConfirmationStatus === acceptedStatus && item.doc.teacherConfirmationStatus === acceptedStatus) {
                  response.userRole = item.doc.studentId === uid ? config.studyProjectConfig.userRoleInStudyClass.student : response.userRole;
                  response.summary.numberOfStudents++;
               }
               else if (item.doc.studentConfirmationStatus === requestedStatus && item.doc.teacherConfirmationStatus === acceptedStatus) {
                  response.userRole = item.doc.studentId === uid ? 'Invited student' : response.userRole;
                  response.summary.numberOfInvitedStudents++;
               }
               else if (item.doc.studentConfirmationStatus === acceptedStatus && item.doc.teacherConfirmationStatus === requestedStatus) {
                  response.userRole = item.doc.studentId === uid ? 'Requested student' : response.userRole;
                  response.summary.numberOfRequestedStudents++;
               }
            });
            getPublicationView(runId, uid, response.class.publicationId).then(function (studyCourseInfo) {
               response = _.extend(response, studyCourseInfo);
               deferred.resolve(response);
            }).fail(deferred.reject);
         }
         else {
            deferred.reject(utils.addSeverityResponse('Students has not found in BF study class info.', config.businessFunctionStatus.error));
         }
      });
      return deferred.promise;
   }

   function searchStudents(classId, filter, itemsCount) {
      var deferred = q.defer();
      db.view('Views', 'studyclassStudentByClassId', { keys: [classId], include_docs: true}, function (err, students) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (students.rows) {
            students = _.map(students.rows, function (student) {
               if (student.value) {
                  student.value.userId = student.value._id;
                  delete student.value._id;
               }
               else {
                  return 'not valid account';
               }
               if (student.doc) {
                  return _.extend(student.value, {
                     email: student.doc.email,
                     lastName: student.doc.lastName,
                     firstName: student.doc.firstName,
                     photo: student.doc.photo
                  });
               }
               else {
                  return 'not valid account';
               }
            });
            students = _.without(students, 'not valid account');
            students = _.filter(students, function (student) {

               return (student.lastName.toLowerCase().indexOf(filter) !== -1 || student.firstName.toLowerCase().indexOf(filter) !== -1 || student.email.indexOf(filter) !== -1) &&
                   ((student.teacherConfirmationStatus === acceptedStatus || student.teacherConfirmationStatus === requestedStatus) &&
                       (student.studentConfirmationStatus === acceptedStatus || student.studentConfirmationStatus === requestedStatus)) ||
                   student.type === typeTeacher;
            });
            if (itemsCount) {
               students = students.slice(0, itemsCount);
            }
            deferred.resolve(students);
         }
      });
      return deferred.promise;
   }

   function searchTeachersForClass(_classId, _filter, _itemsCount) {
      var deferred = q.defer(),
          students = {},
          teachers = {},
          activeUsers = [];

      db.view('Views', 'studyclassActiveUsersByClassId', { keys: [_classId, 'activeUser'], include_docs: true},
          function (err, _students) {
             if (err) {
                deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
             }
             else if (_students.rows) {
                _students = _students.rows;
                _.each(_students, function (_s) {
                   _s = _s.doc;
                   if (_s) {
                      switch (_s.type) {
                         case typeStudent:
                            students[_s.studentId] = _s;
                            break;
                         case typeTeacher:
                            teachers[_s.teacherId] = _s;
                            break;
                         default:
                            activeUsers.push(_s);
                            break;
                      }
                   }
                });
                activeUsers = _.map(activeUsers, function (_a) {
                   var activeUser = getBaseUserProfileView(_a);
                   if (teachers[_a._id]) {
                      var lastAction = _.last(teachers[_a._id].classTeacherAction);
                      var alreadyInvited = lastAction.actionType === teacherWasAdded || teachers[_a._id].actionType === createdByTeacher || !teachers[_a._id].actionType;
                      var role = lastAction.actionType === teacherWasAdded ? roleTeacherAndStudent : roleTeacher;
                      return _.extend(activeUser, {
                         alreadyInvited: alreadyInvited,
                         role: role
                      });
                   }
                   else if (students[_a._id]) {
                      return _.extend(activeUser, {
                         role: roleStudent
                      });
                   }
                   return activeUser;
                });

                if (!!_filter) {
                   activeUsers = applyFilter(activeUsers, _filter);
                }

                if (!!_itemsCount) {
                   activeUsers = cutArray(activeUsers, _itemsCount);
                }
                deferred.resolve(activeUsers);
             }

             function getBaseUserProfileView(user) {
                return {
                   userId: user._id,
                   firstName: user.firstName,
                   lastName: user.lastName,
                   photo: user.photo || ''
                };
             }

             function applyFilter(arr, text) {
                return _.filter(arr, function (el) {
                   var _t = text && text.toLowerCase();
                   return el.firstName.toLowerCase().indexOf(_t) === 0 || el.lastName.toLowerCase().indexOf(_t) === 0;
                });
             }

             function cutArray(arr, i) {
                i = parseInt(i);
                if (typeof i !== 'number') {
                   return arr;
                }
                return arr.slice(0, i);
             }
          });
      return deferred.promise;
   }

   var getTeacher = function (classId, uid, _date) {
      return {
         classId      : classId,
         teacherId    : uid,
         studyId      : '',
         registeredAt : _date,
         modifiedAt   : _date,
         active       : true,
         type         : typeTeacher,
         classTeacherAction: [
            {//TODO
               performedAt : _date,
               actionType  : createdByTeacher,
               cpmment     : ''
            }
         ]
      };
   };

   var getDefaultClassModel = function (_date) {
      return {
         classId       : '',
         publicationId : '',
         cover         : '',
         registeredAt  : _date,
         modifiedAt    : _date,
         classType     : 'Official',
         status        : classActive,
         name          : 'New Study Project',
         description   : "This Project was created for studying",
         type          : DBtype
      };
   };

   function createByPublicationId(uid, publicationId) {
      var deferred = q.defer();
      var date = new Date().getTime(),
          dateStart = new Date(date).setHours(0, 0, 0, 0),
          dateEnd = new Date(date).setHours(23, 59, 59, 999);

      var insertData = {
             publicationId: publicationId
          },
          classId,
          mode = 'Class';

      var publPromise = publication.GetPublicationDetails(uid, {id: publicationId});

      q.all([insertStudyClass(insertData), publPromise]).then(function (response) {
         var studyClass = response[0],
             publication = response[1];
         classId = studyClass.id;
         studyClass = {
            _id               : classId,
            _rev              : studyClass.rev,
            classId           : studyClass.id,
            publicationId     : publicationId,
            cover             : studyClass.cover || '', // TODO clarify
            registeredAt      : date,
            modifiedAt        : date,
            classType         : 'Official',
            name              : 'New Study Project', // publication.title,
            publicationType   : publication.type,
            description       : util.format("This Project was created for studying %s", publication.name),
            scheduledAt       : dateStart,
            joinEndDate       : dateEnd,
            expectedDuration  : 1800000, // TODO clarify
            type              : DBtype,
            studyClassStatus  : classActive
         };
         var teacher = getTeacher(classId, uid, date);

         userStudy.initiate(uid, mode, publicationId, classId);
         return bulkInsert([studyClass, teacher]);
      })
          .then(function (response) {
             if (response.status === config.businessFunctionStatus.ok) {
                deferred.resolve({classId: classId});
             }
             else {
                deferred.reject(response);
             }
          }).fail(deferred.reject);

      return deferred.promise;
   }

   function createByClassId(uid, studyClass) {
      var deferred     = q.defer();
      var date         = Date.now();
      var mode         = 'Class';
      var classId      = studyClass.classId;
      var defaultClass = getDefaultClassModel(date);
      var teacher      = getTeacher(classId, uid, date);

      studyClass._id = classId;
      _.defaults(studyClass, defaultClass);

      if (studyClass.classType === 'Independent Study') {
         sendEmailInvite(teacher.teacherId, studyClass, 'en', [teacher.teacherId])
             .then(function (response) {
                logger.log(response);
             }, function (err) {
                logger.error(err);
             });
      }
      bulkInsert([studyClass, teacher])
          .then(function createClassDiscussion(response) {
             var result = null;
             if (response.status === config.businessFunctionStatus.ok) {
                result = discussion.createDiscussionsForClass(classId);
             }
             else {
                deferred.reject(response);
             }
             return result;
          })
          .then(function () {
             if (studyClass.publicationId) {
                userStudy.initiate(uid, mode, studyClass.publicationId, classId);
             }
             deferred.resolve({
                classId: classId
             });
          })
          .fail(deferred.reject);
      return deferred.promise;
   }

   function updateStudyClass(uid, params) {
      var deferred = q.defer();
      dbget(params.classId).then(function (studyClass) {
         delete params._id;
         delete params._rev;
         studyClass = _.extend(studyClass, params);
         if ( !params.joinEndDate ) {
            delete studyClass.expectedDailyWork;
            delete studyClass.joinEndDate;
         }
         return  insertStudyClass(studyClass);
      }).then(function (studyClass) {
         deferred.resolve({classId: studyClass.id});
      }).fail(deferred.reject);
      return deferred.promise;
   }

   function getStudentActions(uid, classId, studentId) {
      var deferred = q.defer();
      var response = {},
          studentActionsResp = [];
      db.view('Views', 'studyclassActionsByClassAndStudentId', {keys: [
         [classId, studentId]
      ], include_docs: true}, function (err, actions) {
         if (err) {
            response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
         else if (actions.rows.length) {
            studentActionsResp = _.map(actions.rows[0].value.classStudentAction, function (action) {
               var user = actions.rows[0].doc;
               return _.extend(action, {
                  userId: user._id,
                  email: user.email,
                  lastName: user.lastName,
                  firstName: user.firstName,
                  photo: user.photo
               });
            });
            deferred.resolve({actions: studentActionsResp});
         }
         else {
            response = utils.addSeverityResponse(errorMessages.userActionsNotFound, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
      });
      return deferred.promise;
   }

   function searchStudentsForClass(classId, filter, itemsCount, uid) {
      var deferred = q.defer();
      var activeUser = 'activeUser',
          teachers = {};
      filter = filter.toLowerCase();
      db.view('Views', 'studyclassActiveUsersByClassId', { keys: [classId, activeUser], include_docs: true}, function (err, users) {
         var students = {};
         _.each(users.rows, function (student) {
            if (student.key !== activeUser && student.doc.type === typeStudent &&
                student.doc.teacherConfirmationStatus === acceptedStatus &&
                (student.doc.studentConfirmationStatus === acceptedStatus || student.doc.studentConfirmationStatus === requestedStatus)) {
               students[student.doc.studentId] = student.doc;
            }
         });

         _.each(users.rows, function (_u) {
            if (_u.key === classId && _u.doc.type === typeTeacher) {
               teachers[_u.doc.teacherId] = _u;
            }
         });

         users = _.filter(users.rows, function (student) {
            return student.key === activeUser;
         });

         users = _.map(users, function (user) {
            if (
               (user.doc.lastName || '').toLowerCase().indexOf(filter) === 0 ||
               (user.doc.firstName || '').toLowerCase().indexOf(filter) === 0
            ) {
               return {
                  userId: user.doc._id,
                  email: user.doc.email,
                  lastName: user.doc.lastName || '',
                  firstName: user.doc.firstName || '',
                  photo: user.doc.photo,
                  alreadyInClass: !!students[user.doc._id] || user.doc._id === uid || !!teachers[user.doc._id]//TODO: gshe
               };
            }
            return false;
         }).filter(function (user) {
            return user;
         });
         itemsCount = parseInt(itemsCount);
         users = itemsCount ? users.slice(0, itemsCount) : users;
         deferred.resolve(users);
      });
      return deferred.promise;
   }

   var persistStudentActions = function (studentActions, currentActions) {
      //update
      var position;
      studentActions = _.sortBy(_.map(studentActions, function (action) {
         if (action.actionType === currentActions[0].actionType) {
            action.performedAt = currentActions[0].performedAt;
            action.comment = currentActions[0].comment;
         }
         return action;
      }), function (action) {
         return action.performedAt;
      });
      //create
      position = studentActions.length - 1 >= 0 ? studentActions.length - 1 : 0;
      if (studentActions[position].actionType !== currentActions[0].actionType) {
         studentActions.push(currentActions[0]);
      }
      if (currentActions.length !== 1) {
         currentActions.shift();
         return persistStudentActions(studentActions, currentActions);
      }
      else {
         return studentActions;
      }
   };

   var getCurrentActionType = function (status, userRole) {//is this func needed?
      var actionTypeKeys = Object.keys(config.studyProjectConfig.classStudentActionTypeEnum);
      var currentActionType = _.filter(actionTypeKeys, function (actionTypeKey) {
         if (actionTypeKey.indexOf(status) !== -1 && actionTypeKey.indexOf(userRole) !== -1) {
            return config.studyProjectConfig.classStudentActionTypeEnum[actionTypeKey];
         }
         return false;
      });

      if (currentActionType.length === 1) {
         return config.studyProjectConfig.classStudentActionTypeEnum[currentActionType[0]];
      }
      else {
         return false;
      }
   };

   function updateUsers(uid, studyClass, studentIds, status, comment) {
      var date = new Date().getTime(),
          response = {},
          userRole,
          currentAction = {
             performedAt : date,
             comment     : comment
          };

      var currentUser = _.find(studyClass, function (participant) {
         return (participant.active && participant.teacherId === uid) || participant.studentId === uid;
      });

      if ( !currentUser ) {
         response = utils.addSeverityResponse(errorMessages.userRoleNotFound, config.businessFunctionStatus.error);
         return [response];
      }

      var students = _.map(studentIds, function (studentId) {
         var student = _.find(studyClass, function (studyClassItem) {
            return studyClassItem.studentId === studentId;
         });

         if ( !student ) {
            response = utils.addSeverityResponse(errorMessages.studentNotFound, config.businessFunctionStatus.error);
            return response;
         }

         // update action
         if ( currentUser.studentId ) {
            userRole = 'Student';
            student = _.extend(student, {
               modifiedAt: date,
               studentConfirmationStatus: status
            });
         }
         else if ( currentUser.teacherId && currentUser.active ) {
            userRole = 'Teacher';
            student = _.extend(student, {
               modifiedAt: date,
               teacherConfirmationStatus: status
            });
         }
         currentAction.actionType = getCurrentActionType(status, userRole);
         // update status
         if ( currentAction.actionType ) {
            student.classStudentAction = persistStudentActions(student.classStudentAction, [currentAction]);
            if (userRole === roleTeacher && (student.teacherConfirmationStatus === acceptedStatus || student.teacherConfirmationStatus === blockedStatus)) {
               var extendMessageParams = {
                  classId: student.classId,
                  type   : 'ClassNotificationMessage'
               };
               personalMessage.persist(currentUser.teacherId, [student.studentId], '', student.teacherConfirmationStatus, extendMessageParams);
            }
            return student;
         }
         else {
            response = utils.addSeverityResponse(util.format(errorMessages.actionTypeNotFound, status, userRole), config.businessFunctionStatus.error);
            return response;
         }
      });
      return students;
   }

   function persistStudentStatus(uid, classId, studentIds, status, comment) {
      var deferred = q.defer();
      var response = {},
          students = [];
      var dbQueryParams = {include_docs: true, startkey: [classId, 0], endkey: [classId, 2, {}]};
      db.view('Views', 'studyclassById', dbQueryParams, function (err, studyClass) {
         if (!err) {
            studyClass = _.pluck(studyClass.rows, 'doc');
            var currentClass = _.first(studyClass);
            var teachersIds = _.compact(_.pluck(studyClass, 'teacherId'));
            students = updateUsers(uid, studyClass, studentIds, status, comment);
            var errors = {'statusMessages': []};
            _.each(students, function (student) {
               if (student.hasOwnProperty('statusMessages')) {
                  errors.statusMessages = errors.statusMessages.concat(student.statusMessages);
               }
               if (currentClass.classType === 'Moderated' &&
                   student.studentConfirmationStatus === acceptedStatus &&
                   student.teacherConfirmationStatus === acceptedStatus) {
                  var inviteContext = _.extend(currentClass, student);
                  sendEmailInvite(student.studentId, inviteContext, 'en', teachersIds)
                      .then(function (response) {
                         logger.log(response);
                      }, function (err) {
                         logger.error(err);
                      });
               }
            });

            if (errors.statusMessages.length) {
               deferred.reject(errors);
            }
            else {
               bulkInsert(students)
                   .then(function (response) {
                      deferred.resolve({status: 'Success'});
                   }, deferred.reject);
            }
         }
         else {
            response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
      });
      return deferred.promise;
   }

   function persistClassTeachersStatus(_uid, _classId, _teacherIds, _status, _comment) {
      var dbQueryParams = {
             include_docs : true,
             startkey     : [_classId, 0],
             endkey       : [_classId, 2, {}]
          },
          errors = {'statusMessages': []};

      if ( _.isArray(_teacherIds) && !_teacherIds.length || !_teacherIds ) {
         return q({status: 'Nothing to save'});
      }

      return _db.view('studyclassById', dbQueryParams)
          .then(function (_response) {
             _response = _.pluck(_response[0].rows, 'doc');
             return _updateTeachers(_uid, _response, _teacherIds, _status, _comment).then(_persistTeachers);
          }).catch(function (err) {
             return q.reject(err);
          });

      function _updateTeachers(_uid, _studyClass, _teacherIds, _status, _comment) {
         var date              = new Date().getTime(),
             currentTeacher    = _getUserData(_uid, _studyClass, 'teacher'),
             users             = [],
             usersForUpdate    = [],
             query = {
                keys         : _teacherIds,
                include_docs : true
             };

         return _db.fetch(query).then(function (_response) {
            users = _response && _response[0].rows;
            _.each(_teacherIds, function (_id) {
               var teacher = _getUserData(_id, _studyClass, 'teacher'),
                   student = _getUserData(_id, _studyClass, 'student');

               if (teacher) {
                  switch (_status) {
                     case declinedStatus:
                        if ( !student ) {
                           student = _getStudentModel(teacher, _classId, date);
                        }
                        else {
                           student = _.extend(student, {
                              teacherConfirmationStatus : acceptedStatus,
                              studentConfirmationStatus : acceptedStatus
                           });
                        }
                        usersForUpdate.push(student);
                        _updateTeacherData(teacher, teacherWasRemoved, date, _comment, false);
                        break;
                     case acceptedStatus:
                        _updateTeacherData(teacher, teacherWasAdded, date, _comment, true);
                        break;
                     default:
                        break;
                  }
               }
               else {
                  teacher = _.filter(users, function (_u) {
                     return _u.doc._id === _id;
                  });
                  teacher = getTeacher(_classId, teacher[0].doc._id, date);
                  teacher.classTeacherAction[0].actionType = teacherWasAdded;
               }
               usersForUpdate.push(teacher);
            });
            return usersForUpdate;
         }).then(function (teachers) {
            if ( _status !== declinedStatus ) {
               personalMessage.persist(currentTeacher.teacherId, _teacherIds, '', 'You were added to Course as Teacher');
               _sendInvitations(currentTeacher, teachers, _teacherIds, _studyClass);
            }
            return teachers;
         }).catch(function (err) {
            return q.reject(err);
         });
      }

      function _getUserData (_uid, _class, _role) {
         return _.filter(_class, function (_classItem) {
            return _role && _classItem[_role + 'Id'] === _uid;
         })[0];
      }

      function _updateTeacherData (_user, _actionType, _date, _comment, _isActive) {
         _user.active     = _isActive;
         _user.modifiedAt = _date;
         _user.classTeacherAction.push({
            performedAt : _date,
            actionType  : _actionType,
            comment     : _comment
         });
      }

      function _getStudentModel (_user, _classId, _date) {
         return {
            type                      : typeStudent,
            registeredAt              : _user.registeredAt,
            classId                   : _classId,
            active                    : true,
            studentId                 : _user.teacherId,
            teacherConfirmationStatus : acceptedStatus,
            studentConfirmationStatus : acceptedStatus,
            classStudentAction : [{
               modifiedAt                : _date + 1,
               teacherConfirmationStatus : acceptedStatus,
               studentConfirmationStatus : acceptedStatus
            }]
         };
      }

      function _persistTeachers(teachers) {
         if (errors.statusMessages.length) {
            return q.reject(errors);
         }
         else {
            return bulkInsert(teachers);
         }
      }

      function _sendInvitations(_teacherProfile, _teachers, _ids, _class) {
         _.each(_teachers, function (_t) {
            if (_.has(_t, 'statusMessages')) {
               errors.statusMessages = errors.statusMessages.concat(_t.statusMessages);
            }

            var inviteContext = {
               classId: _class[0].classId,
               name: _class[0].name,
               type: 'inviteTeacherToClass'
            };
            if(_teacherProfile.teacherId !== _t.teacherId) {
              sendEmailInvite(_t.teacherId, inviteContext, 'en', [_teacherProfile.teacherId])
                  .then(function (response) {
                     logger.log(response);
                  }, function (err) {
                     logger.error(err);
                  });
            }
         });
      }
   }

   function cancelStudyClass(userId, classId, comment) {
      var students = [],
          studentIds = [],
          subject = 'Course Cancelled';

      return dbget(classId).then(function (studyClass) {
         studyClass = _.extend(studyClass, {studyClassStatus: classCancelled});
         return q.all([
            insertStudyClass(studyClass),
            searchStudentsForClass(classId, '', '', userId)
         ]);
      }).then(function (response) {
         students = response[1];
         if (students && students.length !== 0) {
            _.each(students, function (student) {
               if (student.alreadyInClass) {
                  studentIds.push(student.userId);
               }
            });
         }
         var extendMessageParams = {
            classId : classId
         };
         personalMessage.persist(userId, studentIds, comment, subject, extendMessageParams);
         return response[0];
      }).catch(function (err) {
         return err;
      });
   }

   var getStudentStatus = function (classView, data, userRole, comment) {
      var accepted = config.studyProjectConfig.membershipStatus.accepted,
          requested = config.studyProjectConfig.membershipStatus.requested,
          teacherAccept = config.studyProjectConfig.classStudentActionTypeEnum.classMembershipAcceptedByTeacher,
          studentAccept = config.studyProjectConfig.classStudentActionTypeEnum.classMembershipAcceptedByStudent,
          studentRequest = config.studyProjectConfig.classStudentActionTypeEnum.classMembershipRequestedByStudent,
          teacherRequest = config.studyProjectConfig.classStudentActionTypeEnum.classMembershipRequestedByTeacher;
      var classTypes = {
         'Institutional': {
            modifiedAt: data + 1,
            teacherConfirmationStatus: accepted,
            studentConfirmationStatus: accepted,
            classStudentAction: [
               {
                  performedAt: data,
                  actionType: teacherAccept,
                  comment: comment
               },
               {
                  performedAt: data + 1,
                  actionType: studentAccept,
                  comment: comment
               }
            ]
         },
         'Public': {
            modifiedAt: data + 1,
            teacherConfirmationStatus: accepted,
            studentConfirmationStatus: userRole === roleStudent ? accepted : requested,
            classStudentAction: [
               {
                  performedAt: data,
                  actionType: userRole === roleTeacher ? teacherAccept : studentAccept,
                  comment: comment
               },
               {
                  performedAt: data + 1,
                  actionType: userRole === roleStudent ? studentAccept : teacherRequest,
                  comment: comment
               }
            ]
         },
         'Moderated': {
            modifiedAt: data + 1,
            teacherConfirmationStatus: userRole === roleTeacher ? accepted : requested,
            studentConfirmationStatus: userRole === roleStudent ? accepted : requested,
            classStudentAction: [
               {
                  performedAt: data,
                  actionType: userRole === roleTeacher ? teacherAccept : studentAccept,
                  comment: comment
               },
               {
                  performedAt: data + 1,
                  actionType: userRole === roleStudent ? studentRequest : teacherRequest,
                  comment: comment
               }
            ]
         },
         'Private': {
            modifiedAt: data + 1,
            teacherConfirmationStatus: accepted,
            studentConfirmationStatus: requested,
            classStudentAction: [
               {
                  performedAt: data,
                  actionType: teacherAccept,
                  comment: comment
               },
               {
                  performedAt: data + 1,
                  actionType: teacherRequest,
                  comment: comment
               }
            ]
         },
         'Independent Study': {
            modifiedAt: data + 1,
            teacherConfirmationStatus: accepted,
            studentConfirmationStatus: accepted,
            classStudentAction: [
               {
                  performedAt: data,
                  actionType: teacherAccept,
                  comment: comment
               },
               {
                  performedAt: data + 1,
                  actionType: studentAccept,
                  comment: comment
               }
            ]
         }
      };
      return classTypes[classView.classType];
   };

   function getStartDate(startDateMs) {
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var startDate = new Date(startDateMs);
      var month = monthNames[startDate.getMonth()];
      var day = startDate.getDate() > 10 ? startDate.getDate() : '0' + startDate.getDate();
      return month + '. ' + day + ', ' + startDate.getFullYear();
   }


   function sendEmailInvite(recipientId, inviteContext, lang, teachersIds) {
      var promises = [];
      promises = _.map(teachersIds, function (teachersId) {
         return manageUsers.getUser(teachersId);
      });

      return q.all(promises)
          .then(function (teachersProfiles) {
             var teachersProfile = _.first(teachersProfiles); //TODO: add bihevior for many teachers
             var emailInfoParams = {
                emailTitleSuffix: '“' + inviteContext.name + '”',
                courseName: inviteContext.name,
                teacher: '',
                link: '',
                startDate: ''
             };
             emailInfoParams.startDate = getStartDate(inviteContext.scheduledAt);
             emailInfoParams.teacher = teachersProfile.firstName + ' ' + teachersProfile.lastName;
             emailInfoParams.isJoinEndDate = !!inviteContext.joinEndDate;

             return inviteController.sendEmailInvite([recipientId], inviteContext, emailInfoParams, lang);
          }, function (err) {
             return err;
          });
   }

   var inviteStudent = function (classId, userIds, comment, classView, userRole, userId) {
      var deferred = q.defer();
      var updatedStudents = [],
          recipientIds = [],
          teacherIds = Object.keys(classView.teacher || {}),
          data = new Date().getTime(),
          mode = 'Class';

      var studentDefultStatus = getStudentStatus(classView.class, data, userRole, comment);

      userIds = _.filter(userIds, function (studentId) {//?
         return studentId;
      });
      _.each(userIds, function (studentId) {
         var student = {};
         if (classView.students[studentId]) {
            student = classView.students[studentId];
            studentDefultStatus.classStudentAction = persistStudentActions(student.classStudentAction, studentDefultStatus.classStudentAction);
            student = _.extend(student, studentDefultStatus);
         }
         else {
            student = _.extend(studentDefultStatus, {
               classId      : classId,
               studentId    : studentId,
               studyId      : '',
               registeredAt : data,
               modifiedAt   : data,
               type         : typeStudent
            });
         }

         if (student.studentConfirmationStatus === requestedStatus) {
            recipientIds.push(studentId);
         }
         else if (student.teacherConfirmationStatus === requestedStatus) {
            recipientIds = teacherIds;
         }
         //TODO:Improvement #2095 remove when don`t need generate progress
         var _userStudy = {};
         var _studyClass = classView.class;
         var emailsForTest = config.studyProjectConfig.userEmailsForTestProgress;
         var teachersIds = _.keys(classView.teacher);
         var inviteContext = _.extend(classView.class, student);
         sendEmailInvite(student.studentId, inviteContext, 'en', teachersIds)
             .then(function (response) {
                logger.log(response);
             }, function (err) {
                logger.error(err);
             });
         userStudy.initiate(studentId, mode, classView.class.publicationId, classId)
             .then(function (userStudy) {
                _userStudy = userStudy;
                return dbget(userStudy.userId);
             })
             .then(function (user) {
                var student = classView.students[user._id] || {};
                if (emailsForTest.indexOf(user.email) !== -1 && _.isEmpty(student)) {
                   return robotStudent.generateUserStudy(_userStudy, _studyClass, 4);
                }
             });

         updatedStudents.push(student);
      });
      if (updatedStudents.length !== 0) {
         bulkInsert(updatedStudents).then(function (response) {
            if (response.status === config.businessFunctionStatus.ok) {
               if (recipientIds.length !== 0 && userRole === roleTeacher) {
                  var subject = 'Invite'; //TODO clarify text
                  var extendMessageParams = {
                     classId: classId,
                     type   : 'ClassNotificationMessage'
                  };
                  return personalMessage.persist(userId, recipientIds, comment, subject, extendMessageParams);
               }
               else {
                  deferred.resolve({status: 'Success.'});
               }
            }
            else {
               deferred.reject(response);
            }
         })
             .then(deferred.resolve)
             .fail(deferred.reject);
      }
      else {
         deferred.resolve({status: 'Failed.'});
      }

      return deferred.promise;
   };

   function inviteStudents(userId, classId, userIds, comment) {
      var deferred = q.defer();
      var response = {};
      getClassView(classId).then(function (classView) {
         if (userIds.length !== 0) {
            var userRole = classView.teacher[userId] ? roleTeacher : roleStudent;
            return inviteStudent(classId, userIds, comment, classView, userRole, userId);
         }
         else {
            response = utils.addSeverityResponse(errorMessages.usersNotFound, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
      }).then(deferred.resolve).fail(deferred.reject);
      return deferred.promise;
   }

   var getStudyClassView = function (userId, classIds, studyClassView, _studyProgress) {
      var deferred = q.defer();
      var classInfo = {membership: [], role: 'undefined', teachers: [], course: {}, class: {}},
          removeFieldsBase = ['_id', '_rev', 'type', 'studyClassType'],
          removeFieldsStudent = removeFieldsBase.concat(['classStudentAction']);
      db.view('Views', 'studyclassInfoByClassId', { keys: [classIds[0]], include_docs: true}, function (err, studyClassItem) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (studyClassItem.rows.length !== 1) {
            _.each(studyClassItem.rows, function (item) {
               if (item.doc && (item.doc._id === userId || item.doc.studentId === userId)) {
                  classInfo.role = item.doc.type === typeStudent ? roleStudent : roleTeacher;
               }
               if (item.doc && item.doc.type === 'UserProfile') {
                  classInfo.teachers.push(stripTeacherData(item));
               }
               else if (item.doc && item.doc.type === typeStudent) {
                  deleteFields(item.doc, removeFieldsStudent);
                  classInfo.membership.push(item.doc);
               }
               else if (item.doc && item.doc.type === typeStudyClass) {
                  deleteFields(item.doc, removeFieldsBase);
                  classInfo.class = item.doc;
                  classInfo.class.readingProgress = 0;
                  if (_studyProgress && _studyProgress[classInfo.class.classId]) {
                     classInfo.class.readingProgress = _studyProgress[classInfo.class.classId].readingProgress;
                  }
               }
            });

            publication.GetPublicationDetails(userId, {id: classInfo.class.publicationId}).then(function (publ) {
               classInfo.course = {
                  id: publ._id,
                  publicationType: publ.type,
                  name: publ.name,
                  author: publ.author,
                  description: publ.description,
                  cover: publ.cover,
                  categories: [].concat([publ.category]),
                  audio: publ.mediaSize !== 0,
                  wordsNumber: publ.wordsCount,
                  readingTime: publ.readingTime,
                  difficulty: publ.difficulty
               };
               studyClassView.push(classInfo);
               if (classIds.length !== 1) {
                  classIds.shift();
                  deferred.resolve(getStudyClassView(userId, classIds, studyClassView, _studyProgress));
               }
               else {
                  deferred.resolve(studyClassView);
               }
            }, function (reason) {
               if (classIds.length !== 1) {
                  classIds.shift();
                  deferred.resolve(getStudyClassView(userId, classIds, studyClassView, _studyProgress));
               }
               else {
                  deferred.resolve(studyClassView);
               }
            });
         }
         else {
            deferred.reject(utils.addSeverityResponse('Study class has not found by class id ' + classIds[0], config.businessFunctionStatus.error));
         }
      });
      return deferred.promise;
   };

   var filterMembers = function (membership) {
      membership = _.filter(membership, function (member) {
         return member.studentConfirmationStatus === acceptedStatus && member.teacherConfirmationStatus === acceptedStatus ||
             member.studentConfirmationStatus === requestedStatus && member.teacherConfirmationStatus === acceptedStatus;
      });
      return membership;
   };

   function searchClasses(userId) {
      var deferred = q.defer();
      var response = {}, studyClassView = [], classIds, _studyProgress = {};
      db.view('Views', 'studyclassTeachersAndStudentsById', {key: userId, include_docs: true}, function (err, participants) {
         if (err) {
            response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(response);
         }
         else if (participants.rows.length !== 0) {
            classIds = _.map(participants.rows, function (participant) {
               return participant.doc.classId;
            });
            var _classIds = _.clone(classIds);
            if (userPublications.getStudyProgress) {
               var viewName = 'userStudiesStudyClass',
                   param = 'classId';

               userPublications.getStudyProgress(userId, _classIds, viewName, param, _studyProgress).then(function (_studyProgress) {
                  getStudyClassView(userId, _classIds, studyClassView, _studyProgress).then(function (studyClasses) {
                     var response = [],
                         _studyClassesTeacherRole = {},
                         _studyClassesStudentRole = {};

                     _.each(studyClasses, function (_sc) {
                        if ( _sc.class.studyClassStatus === classCancelled ) {
                           return false;
                        }
                        switch ( _sc.role ) {
                           case roleStudent:
                              var student = _.where(_sc.membership, {studentId: userId})[0] || {};
                              if ((student.studentConfirmationStatus === acceptedStatus || student.studentConfirmationStatus === requestedStatus) &&
                                  student.teacherConfirmationStatus === acceptedStatus) {
                                 _sc.membership = filterMembers(_sc.membership);
                                 _studyClassesStudentRole[_sc.class.classId] = _sc;
                              }
                              break;
                           case roleTeacher:
                           case roleTeacherAndStudent:
                              _sc.membership = filterMembers(_sc.membership);
                              _studyClassesTeacherRole[_sc.class.classId] = _sc;
                              break;
                           default:
                              break;
                        }
                     });
                     response = _.values(_.extend(_studyClassesTeacherRole, _studyClassesStudentRole));
                     deferred.resolve(response);
                  }, deferred.reject);
               }, deferred.reject);
            }
            else {
               getStudyClassView(userId, _classIds, studyClassView, _studyProgress).then(deferred.resolve, deferred.reject);
            }
         }
         else {
            deferred.resolve(studyClassView);
         }

      });
      return deferred.promise;
   }

   function searchByPublication(userId, publicationId, filter, itemsCount) {
      var studyClassView = [];

      return _db.view('publicationsRelated', {
         startkey : [publicationId],
         endkey   : [publicationId, {}]
      })
      .spread(function (publicationsRelated) {
         var relatedIds = _.map(publicationsRelated.rows,
            function (_obj) {
               return _obj.id;
            });
         relatedIds.push(publicationId);
         return _db.view('studyclassByPublicationId', {
            keys         : relatedIds,
            include_docs : true
         });
      })
      .spread(function (studyClasses) {
         var resultClassIds = [];
         studyClasses = studyClasses && studyClasses.rows;
         filter       = filter || '';
         filter       = filter.toLowerCase();

         _.each(studyClasses, function (studyClass) {
            var className = studyClass && studyClass.doc && studyClass.doc.name ? studyClass.doc.name.toLowerCase() : '';
            if ( className.indexOf(filter) !== -1 ) {
               resultClassIds.push(studyClass.doc.classId);
            }
         });

         itemsCount     = itemsCount || resultClassIds.length;
         resultClassIds = resultClassIds.slice(0, itemsCount);

         if ( resultClassIds.length !== 0 ) {
            return getStudyClassView(userId, resultClassIds, studyClassView)
               .then(function (studyClassView) {
                  return _.filter(studyClassView, function (studyItem) {
                     return studyItem.role !== roleTeacher && (studyItem.class.classType === 'Public' ||
                            studyItem.class.classType === 'Moderated');
                  });
               });
         }
         return [];
      });
   }

   module.exports = {
      getInfo                : getStudyClassInfo,
      createByPublicationId  : createByPublicationId,
      createByClassId        : createByClassId,
      update                 : updateStudyClass,
      getStudentActions      : getStudentActions,
      searchStudents         : searchStudents,
      searchTeachers         : searchTeachersForClass,
      searchStudentsForClass : searchStudentsForClass,
      persistStudentStatus   : persistStudentStatus,
      persistTeachersStatus  : persistClassTeachersStatus,
      inviteStudents         : inviteStudents,
      searchClasses          : searchClasses,
      searchByPublication    : searchByPublication,
      cancelStudyClass       : cancelStudyClass
   };
})();