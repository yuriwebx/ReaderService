/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var applicationSession = require('./bl/applicationSessions');
var studyclass         = require('./studyclass');
var utils              = require('../utils/utils.js');
var config             = require(__dirname + '/../utils/configReader.js');

function _onFailFilter(res, reason) {
  res.send(reason);
}

function getSearchFunction(req, res, typeOfSearch) {
    var runId = req.headers['x-run-id'] || '',
      classId = req.param('classId'),
      filter = req.param('filter'),
      itemsCount = req.param('itemsCount');

    applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason){
       _onFailFilter(res, reason);
    });

    function _onSuccessFilter(uid) {
      studyclass[typeOfSearch](classId, filter, itemsCount, uid).then(function(students) {
        res.send(students);
      }, function(reason) {
        res.send(reason);
      });
    }
}

module.exports = {
   GET : {
      info: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
            classId = req.param('classId');

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          studyclass.getInfo(runId, uid, classId).then(function(info){
            res.send(info);
          }, function(reason){
            res.send(reason);
          });
        }
      },
      studentactions: function (req, res) {
         var runId = req.headers['x-run-id'] || '',
             classId = req.param('classId'),
             studentId = req.param('studentId');

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          studyclass.getStudentActions(uid,classId, studentId).then(function(studentActions){
            res.send(studentActions);
          }, function(reason){
            res.send(reason);
          });
        }
      },
      searchstudents: function(req, res){
        getSearchFunction(req, res, 'searchStudents');
      },
      searchstudentsforclass: function(req, res){
        getSearchFunction(req, res, 'searchStudentsForClass');
      },
      searchstudyclasses: function(req, res){
        var runId = req.headers['x-run-id'] || '';

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          studyclass.searchClasses(uid, req.param('studyClassId')).then(function(studyClasses){
            res.send(studyClasses);
          }, function(reason){
            res.send(reason);
          });
        }
      },
      searchbypublication: function(req, res){
        var runId         = req.headers['x-run-id'] || '',
            publicationId = req.param('publicationId'),
            filter        = req.param('filter'),
            itemsCount    = req.param('itemsCount');

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          studyclass.searchByPublication(uid, publicationId, filter, itemsCount).then(function(studyClasses){
            res.send(studyClasses);
          }, function(reason){
            res.send(reason);
          });
        }
      },
      searchTeachers: function (req, res) {
         getSearchFunction(req, res, 'searchTeachers');
      }
   },
   POST : {
      persist: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
          studyClass = req.param("studyClass") || {},
          type       = req.param("type") || '';
        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          if(type === 'createByPublicationId' && studyClass.publicationId){
            studyclass.createByPublicationId(uid, studyClass.publicationId).then(function (response) {
              res.send(response);
            }, function  (reason) {
              res.send(reason);
            });
          }
          else if(type === 'createByClassId' && studyClass.classId){
            studyclass.createByClassId(uid, studyClass).then(function (response) {
              res.send(response);
            }, function  (reason) {
              res.send(reason);
            });
          }
          else if(type === 'updateClass'){
            studyclass.update(uid, studyClass).then(function (response) {
              res.send(response);
            }, function  (reason) {
              res.send(reason);
            });
          }
          else{
            res.send(utils.addSeverityResponse('Has not found type' + type +
                                               ' or classId '       + studyClass.classId +
                                               ' or publicationId ' + studyClass.publicationId, config.businessFunctionStatus.error));
          }
        }
      },
      persiststudentstatus: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
          userId = req.param("userId"), //??
          classId = req.param("classId"),
          studentIds = req.param("studentIds"),
          status = req.param("status"),
          comment = req.param("comment");

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(uid) {
          studyclass.persistStudentStatus(uid, classId, studentIds, status, comment, userId).then(function (response) {
            res.send(response);
          }, function(reason){
            res.send(reason);
          });
        }

      },
      persistteachersstatus: function(req, res) {
         var runId = req.headers['x-run-id'] || '',
             userId = req.param("userId"),
             classId = req.param("classId"),
             teacherIds = req.param("teacherIds"),
             status = req.param("status"),
             comment = req.param("comment");

         applicationSession.getUserId(runId)
             .then(function(uid) {
                studyclass.persistTeachersStatus(uid, classId, teacherIds, status, comment, userId)
                    .then(function (data) {
                       res.send(data);
                    }, _onReject);
             }, _onReject);

         function _onReject(err) {
            res.send(err);
         }

      },
      cancelstudyclass: function (req, res) {
         var userId = req.headers['x-run-id'] || '',
             classId = req.param("classId"),
             comment = req.param("comment");

         applicationSession.getUserId(userId).then(_onSuccessFilter).fail(function(reason) {
            _onFailFilter(res, reason);
         });

         function _onSuccessFilter(uid) {
            studyclass.cancelStudyClass(uid, classId, comment)
                .then(function (response) {
                   res.send(response);
                }).catch(function(reason){
                   res.send(reason);
                });
         }
      },
      invitestudents: function (req, res) {
        var runId = req.headers['x-run-id'] || '',
          classId = req.param('classId'),
          userIds = req.param('userIds'),
          comment = req.param('comment');

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason) {
          _onFailFilter(res, reason);
        });

        function _onSuccessFilter(userId) {
          studyclass.inviteStudents(userId, classId, userIds, comment).then(function(response){
            res.send(response);
          }, function(reason){
            res.send(reason);
          });
        }
      }
   }
   /*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};