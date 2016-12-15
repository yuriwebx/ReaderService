/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var config = require(__dirname + '/../utils/configReader.js');
   var q = require('q');
   var _ = require('underscore');
   var utils = require('../utils/utils.js');
   var publication = require('./publication.js');
   // var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);
   var db = require('./dao/utils').findDB();

   var persistTest = function (test) {
      var currentTime = new Date().getTime(),
        _test = {},
        action = 'add',
        exercise = {};
      return q.ninvoke(db, 'view', 'Views', 'testByPublicationAndTestId', {
        key : [test.publicationId, test._id],
        include_docs : true
      })
        .spread(function (body) {
          if (body.rows.length) {
             _test = body.rows[0].doc;
             _test = _.extend(_test, {
                modifiedAt  : currentTime,
                name        : test.name,
                description : test.description
             });
          }
          else {
             _test = {
                _id             : test._id,
                name            : test.name,
                description     : test.description,
                testType        : test.testType,
                locator         : test.locator,
                publicationId   : test.publicationId,
                modifiedAt      : currentTime,
                createdAt       : currentTime,
                type            : 'Test'
             };
          }
          exercise = _.clone(_test);
          exercise.testQuestionsCount = _test.testQuestionsCount ? test.testQuestions.length - _test.testQuestionsCount : test.testQuestions.length;
          action = exercise.testQuestionsCount === test.testQuestions.length ? 'add' : 'update';
          _test.testQuestionsCount = test.testQuestions.length;
          return db.insert(_test);
        })
        .then(function (_test) {
          _.each(test.testQuestions, function(testQuestion) {
             _.extend(testQuestion, {
                testId : _test.id,
                type : 'FlashcardStudy'
             });
          });
          return publication.persistExercises(exercise, action);
        })
        .then(function () {
          return q.ninvoke(db, 'view', 'Views', 'testQuestionsByTestId', {
            key: test._id,
            include_docs : true
          });
        })
        .spread(function (body) {
          var newTestQuestions = {};
          if (body.rows.length) {
            _.each(test.testQuestions, function (testQuestion) {
              newTestQuestions[testQuestion._id] = testQuestion;
            });
            _.each(body.rows, function (existingTestQuestion) {
              if (!newTestQuestions[existingTestQuestion.doc._id]) {
                 test.testQuestions.push({
                    _id      : existingTestQuestion.doc._id,
                    _rev     : existingTestQuestion.doc._rev,
                    _deleted : true
                 });
              }
            });
          }
          return q.ninvoke(db, 'bulk', {docs: test.testQuestions});
        })
        .then(function () {
          return test._id;
        })
        .catch(function _onError (err) {
          var errMsg = err.description || err;
          return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
        });
   };

   var getTest = function (id) {
      var deferred = q.defer();
      var _test, testsArr = [];

      db.get(id, function (err, body) {
         if (err || body.type !== 'Test') {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else {
            _test = body;

            db.view('Views', 'testQuestionsByTestId', {key: id, include_docs: true}, function(err, body) {
               if (err) {
                  deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
               }
               else {
                  if (body.rows.length) {
                     testsArr = _.map(body.rows, function (doc) {
                        return doc.doc;
                     });

                     _.extend(_test, {
                        testQuestions: testsArr
                     });

                     deferred.resolve(_test);
                  }
                  else {
                     deferred.reject(utils.addSeverityResponse('Failed get Test', config.businessFunctionStatus.error));
                  }
               }
            });
         }
      });

      return deferred.promise;
   };

   var uploadAttachment = function (requestData, rawData) {
     var defer = q.defer();
      utils.uploadAttachment(requestData, rawData).then(function(fileHash){
        defer.resolve(fileHash);
      }, defer.reject);
      return defer.promise;
   };

  var getTestsList = function(data) {
    var deferred = q.defer();
    var testsList = [];
    if(data.publicationId){
      db.view('Views', 'testByPublicationId', {'key': data.publicationId, include_docs: true},
        function(err, body) {
          if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
          }
          else {
            if (body.rows.length) {
              _.each(body.rows, function(test) {
                testsList.push(test.doc);
              });
            }
            deferred.resolve(testsList);
          }
        });
    }
    else{
      deferred.resolve(testsList);
    }
    return deferred.promise;
  };

   var exportTests = function (publicationId) {
    var deferred = q.defer();
    var tests    = [];
    var testsIds = [];

    db.view('Views', 'testByPublicationId', {key: publicationId, include_docs: true}, function(err, body) {
      if (err) {
        deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
      }
      else {
        if (body.rows.length) {
          body.rows.forEach(function(row){
            tests.push(row.doc);
            testsIds.push(row.id);
          });
           db.view_with_list('Views', 'testQuestionsByTestId', 'testQuestionAsMap',
              {keys: testsIds, include_docs: true}, function(err, body) {
                if (err) {
                  deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
                }
                else {
                  tests.forEach(function(test) {
                    delete test._rev;
                    delete test.publicationId;
                    test.testQuestions = body[test._id] || [];
                    test.testQuestions.forEach(function(question) {
                      delete question._id;
                      delete question._rev;
                      delete question.testId;
                    });
                  });
                  deferred.resolve(tests);
                }
           });
        }
        else {
          deferred.resolve(tests);
        }
      }
    });

    return deferred.promise;
   };

   var getFile = function(req) {
      var defer = q.defer();
      utils.getFile(req).then(function(file){
        defer.resolve(file);
      },defer.reject);
      return defer.promise;
   };

   var searchTests = function(criteria) {
      var results = [];

      return require('./publication.js').searchStudyGuideByCriteria(criteria)
      .then(function onStudyGuidesSearch(result) {
        return q.ninvoke(db,
            'view_with_list',
            'Views',
            'testByPublicationId',
            'testSearchByCriteria', //use only for pretty output
            {
              keys : result,
              include_docs : true
            });
      })
      .then(function onSearchByStudyGuides(response) {
        results = response[0].result;

        //stopFlag means we've found all
        return response[0].stopFlag ? null : q.ninvoke(db,
          'view_with_list',
          'Views',
          'testByPublicationId',
          'testSearchByCriteria',
          {
            criteria : criteria,
            include_docs : true
          });
      })
      .then(function onSearchByTestName(response) {
        if (response) {
          _.defaults(results, response[0].result);
        }
        delete results.stopFlag;

        return require('./publication.js').getCompactDetails(_.keys(results), ['author', 'name', 'cover']);
      })
      .then(function onExtendResults(details) {
        _.each(_.keys(results), function(key) {
          _.defaults(results[key], details[key]);
        });
        return results;
      })
      .catch(function onErr(err) {
        return utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
      });
   };

   function getTestInfo() {
      var deferred = q.defer();
      db.view_with_list('Views', 'testByPublicationId', 'testViewAsMap', function (err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (Object.keys(body).length !== 0) {
            deferred.resolve({
               status: config.businessFunctionStatus.ok,
               data: body
            });
         }
         else {
            deferred.reject(utils.addSeverityResponse('test not found', config.businessFunctionStatus.error));
        }
      });
    return deferred.promise;
  }

   var removeTests = function (testId) {
      var deferred = q.defer();
      db.view('Views', 'testAndQuestionsById', {key: testId, include_docs: true}, function (err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description + ' manageTest business function removeTests get tests list', config.businessFunctionStatus.error));
         }
         else {
            var testsforDeleting = [];
            var action = 'remove';
            var testsMap = _.map(body.rows, function (val) {
               return val.doc;
            });
            var exercise = _.filter(body.rows, function(test){
              return test.doc.testType === 'Quiz' || test.doc.testType === 'Flashcard';
            });
            if(exercise && exercise.length === 1 && exercise[0].doc){
               publication.persistExercises(exercise[0].doc, action);
            }
            var testQuestionsId = _.map(_.filter(testsMap, function(test){
              return test.type === 'FlashcardStudy';
            }), function(test){
              return test._id;
            });
            _.each(testsMap, function (val) {
               testsforDeleting.push({
                  _id      : val._id,
                  _rev     : val._rev,
                  _deleted : true
               });
            });
            db.view('Views', 'flashcardsByTestQuestionId', {keys: testQuestionsId, include_docs: true}, function (err, testQuestions) {
              if(err){
                 deferred.reject(utils.addSeverityResponse(err.description + ' manageTest business function removeTests get test questions.', config.businessFunctionStatus.error));
              }
              else{
                _.each(testQuestions.rows, function(testQuestion){
                  testsforDeleting.push({
                     _id      : testQuestion.doc._id,
                     _rev     : testQuestion.doc._rev,
                     _deleted : true
                  });
                });
              }
              db.bulk({docs : testsforDeleting}, function (err) {
                 if (err) {
                    deferred.reject(utils.addSeverityResponse(err.description + ' manageTest business function removeTests removing', config.businessFunctionStatus.error));
                 }
                 else {
                    deferred.resolve('done');
                 }
              });
            });
         }
      });
      return deferred.promise;
   };

   module.exports = {
      persistTest       : persistTest,
      getTest           : getTest,
      getTestsList      : getTestsList,
      exportTests       : exportTests,
      uploadAttachment  : uploadAttachment,
      removeTests       : removeTests,

      getTestInfo       : getTestInfo,
      getFile           : getFile,
      searchTests       : searchTests
   };
})();