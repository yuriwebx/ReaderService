/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
   'use strict';
   var utils = require('../utils/utils.js');
   var config = require(__dirname + '/../utils/configReader.js');
   var q = require('q');
   var _ = require('underscore');
   var publications = require('./publication.js');

   var db = require('./dao/utils').findDB();
   var vocabulSearch = require('./vocabularySearch');

   var applicationSession = require('./bl/applicationSessions');

   var getAllFlashCards = function (runId) {
      var deferred = q.defer();
      var flashcardsArr = [];
      var reason = {};
      applicationSession.getUserId(runId).then(
          function (uid) {
             db.view('Views', 'flashcardsByUser', {key: uid, include_docs: true}, function (err, body) {
                if (err) {
                    reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                    deferred.reject(reason);
                }
                else {
                   if(body.rows){
                      body.rows.forEach(function (obj) {
                         flashcardsArr.push(obj.value);
                      });
                   }
                   deferred.resolve(flashcardsArr);
                }
             });
          }, deferred.reject);
      return deferred.promise;
   };

   var getFlashCardsByTerm = function (runId, termName) {
      var deferred = q.defer(),
          partOfSpeechArr = [];
      var reason = {};
      applicationSession.getUserId(runId).then(
          function (uid) {
             db.view('Views', 'flashcardsByUserAndTermName', {'key': [uid, termName], include_docs: true}, function (err, body) {
                if (err) {
                    reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                    deferred.reject(reason);
                }
                else {
                   if (body.rows.length > 0) {
                      body.rows.forEach(function (obj) {
                         partOfSpeechArr.push(obj.doc);
                      });
                      deferred.resolve(partOfSpeechArr);
                   }
                   else {
                      deferred.resolve([]);
                   }
                }
             });
          },deferred.reject);
      return deferred.promise;
   };

   var searchTests = function (criteria, runId) {
      var deferred = q.defer();
      var guidesWithTests = [];
      var reason = {};
      applicationSession.isAuth(runId).then(function () {
         publications.searchStudyGuideByCriteria(criteria).then(function (result) {
            db.view_with_list('Views', 'testByName', 'testSearchByCriteriaAndIds', {
                  criteria: criteria,
                  foundIds: JSON.stringify(result)
               },
               function (err, body) {
                  if (err) {
                    reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                    deferred.reject(reason);
                  }
                  else {
                     guidesWithTests = _.keys(body);
                     publications.getCompactDetails(guidesWithTests).then(function (details) {
                           //rework this block after init.js refactoring
                           body = _.pick(body, _.keys(details));
                           _.keys(details).forEach(function(s) {
                               body[s].author = details[s].author || 'Author';
                               body[s].name = details[s].name || 'Name';
                           });
                           //end of block
                           deferred.resolve(body);
                        }, deferred.reject);
                  }
               });
         }, deferred.reject);
      }, deferred.reject);
      return deferred.promise;
   };

   var activateStudy = function (data, runId) {
      var deferred = q.defer(),
          flashCards = [],
          _currentTime = new Date().getTime(),
          flashcardStudyIds;
      var reason = {};
      applicationSession.getUserId(runId)
          .then(function (uid) {
             db.view('Views', 'testQuestionsByTestId', {key: data.testId}, function (err, body) {
                if (err) {
                   reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                   deferred.reject(reason);
                }
                else {
                  if (body.rows.length) {
                     _.each(body.rows, function(item) {
                        flashCards.push({
                           userId: uid,
                           type: 'FlashcardStudy',
                           mastered: false,
                           correctAnswersCount: 0,
                           createdAt: _currentTime,
                           nextRunAt: _currentTime,
                           testQuestionId: item.id
                        });
                     });

                     db.bulk({
                        docs: flashCards
                     }, function(err, data) {
                        if (err) {
                           reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                           deferred.reject(reason);
                        }
                        else {
                           flashcardStudyIds = _.map(data, function(item) {
                              return item.id;
                           });
                           deferred.resolve(flashcardStudyIds);
                        }
                     });
                  }
                }
             });
          }, deferred.reject);

      return deferred.promise;
   };

   var initiateStudy = function (data, runId) {
      var deferred  = q.defer();
      var queryKeys = [];
      var reason    = {};

      applicationSession.getUserId(runId)
          .then(function (uid) {
             queryKeys = _.map(data.flashcardStudyIds, function (flashcardStudyId) {
                return [uid, flashcardStudyId];
             });

             db.view('Views', 'flashcardsByUserAndId', {keys: queryKeys, include_docs: true},
                 function (err, body) {
                    if (err) {
                        reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                        deferred.reject(reason);
                    }
                    else {
                       if (body.rows.length) {
                          var testQuestionsIds = [], dictionaryTerm = [];
                          _.each(body.rows, function(flashCard){
                            if(flashCard.doc.type === config.flashcardTypeEnum.testQuestion){
                               testQuestionsIds.push(flashCard.doc.testQuestionId);
                            }
                             if (flashCard.doc.type === config.flashcardTypeEnum.dictionaryTerm) {
                                dictionaryTerm.push(flashCard.doc);
                             }
                          });

                          db.view('Views', 'testQuestionsById', {
                              keys: testQuestionsIds, include_docs: true
                            },
                            function(err, data) {
                               var testQuestions = [];

                               if(!err && data.rows && data.rows.length){
                                  testQuestions = _.map(data.rows, function(el){
                                     return el.doc;
                                  });
                               }
                              if(dictionaryTerm.length !== 0){
                                vocabulSearch.createFlashcards(dictionaryTerm).then(function(response) {
                                    if(response.status === config.businessFunctionStatus.ok){
                                          if (err) {
                                            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                                            deferred.reject(reason);
                                          }
                                          else {
                                            testQuestions = testQuestions.concat(response.data);
                                            deferred.resolve(testQuestions);
                                          }
                                    }
                                    else{
                                      deferred.resolve(testQuestions);
                                    }
                                  }, deferred.resolve);
                              }
                              else{
                                deferred.resolve(testQuestions);
                              }
                          });
                        }
                      }
                 });
          }, deferred.reject);

      return deferred.promise;
   };

   var updateStudy = function (data, runId) {
      var deferred = q.defer();

      if ( data && !data.flashcardStudyId ) {
         return q.when({});
      }

      var _currentTime = new Date().getTime();
      var _runTimeSchemaInMS = [
             0,
             10 * 60 * 1000,
             60 * 60 * 1000,
             60 * 5 * 60 * 1000,
             60 * 24 * 60 * 1000,
             5 * 24 * 60 * 60 * 1000,
             25 * 24 * 60 * 60 * 1000
          ];
      var _deltaTime;
      var counter;
      var reason = {};
      applicationSession.getUserId(runId)
          .then(function (uid) {
             db.view('Views', 'flashcardsByUserAndId', {key: [uid, data.flashcardStudyId], include_docs: true}, function (err, body) {
                if (err) {
                  reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                  deferred.reject(reason);
                }
                else {
                   if (body.rows && body.rows.length) {
                      var flashcardStudy = body.rows[0].doc;

                         if (data.passed) {
                            counter = 1 + Number(flashcardStudy.correctAnswersCount);
                            _deltaTime = _runTimeSchemaInMS[counter];

                            if (counter === _runTimeSchemaInMS.length - 1) {
                               _.extend(flashcardStudy, {
                                  lastRunAt: _currentTime,
                                  nextRunAt: 0,
                                  correctAnswersCount: counter,
                                  mastered : true
                               });
                            }
                            else {
                               _.extend(flashcardStudy, {
                                  lastRunAt: _currentTime,
                                  nextRunAt: _currentTime + _deltaTime ,
                                  correctAnswersCount: counter
                               });
                            }
                         }
                         else {
                            _.extend(flashcardStudy, {
                               lastRunAt: _currentTime,
                               nextRunAt: _currentTime,
                               correctAnswersCount: 0
                            });
                         }

                         db.insert(flashcardStudy, function (err) {
                            if (err) {
                              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                              deferred.reject(reason);
                            }
                            else {
                               deferred.resolve({});
                            }
                         });
                   }
                   else {
                      reason = utils.addSeverityResponse('No FlashcardsStudies found', config.businessFunctionStatus.error);
                      deferred.reject(reason);
                   }
                }
             });
          }, deferred.reject);

      return deferred.promise;
   };

   var searchStudies = function (runId) {
      var deferred = q.defer(),
          _currentTime = new Date().getTime(),
          flashCardStudyIds = [];
      var reason = {};
      applicationSession.getUserId(runId).then(function (uid) {
         db.view('Views', 'flashcardsByUserAndRunTime', {startkey: [uid, 0], endkey: [uid, _currentTime]},
             function (err, body) {
                if (err) {
                  reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                  deferred.reject(reason);
                }
                else {
                   if (body.rows.length) {
                      flashCardStudyIds = _.map(body.rows, function (flashCard) { //TODO: make lists
                         return flashCard.id;
                      });
                   }

                   deferred.resolve(flashCardStudyIds);
                }
             });
      }, deferred.reject);

      return deferred.promise;
   };

   var addFlashcard = function (data, runId) {
      var deferred = q.defer(),
          _flashcard = {},
          _currentTime = new Date().getTime(),
          unique = true;
      var reason = {};
      applicationSession.getUserId(runId)
          .then(function (uid) {
             db.view('Views', 'flashcardsByUserAndTermName', {key: [uid, data.dictionaryTermName], include_docs: true}, function (err, body) {
                if (err) {
                   reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                   deferred.reject(reason);
                }
                else {
                  if(body.rows){
                    _.each(body.rows, function(defibition){
                      if(data.partOfSpeech === defibition.doc.partOfSpeech){
                        unique = false;
                      }
                    });
                     if (!unique) {
                        deferred.reject('Flashcard is already exists');
                     }
                     else {
                        _flashcard = {
                           userId: uid,
                           type: 'DictionaryTermStudy',
                           mastered: false,
                           correctAnswersCount: 0,
                           createdAt: _currentTime,
                           lastRunAt: undefined,
                           nextRunAt: _currentTime,
                           termName: data.dictionaryTermName,
                           partOfSpeech: data.partOfSpeech,
                           dictionaryId: data.dictionaryId
                        };

                        db.insert(_flashcard, function (err) {
                           if (err) {
                              reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                              deferred.reject(reason);
                           }
                           else {
                              deferred.resolve({});
                           }
                        });
                     }
                  }
                  else{
                    reason = utils.addSeverityResponse('Flashcard is already exists', config.businessFunctionStatus.error);
                    deferred.reject(reason);
                  }
                }
             });
          }, deferred.reject);

      return deferred.promise;
   };

   var searchAssignedFlashcards = function (reqData, runId) {
      var deferred = q.defer(),
          testQuestionIds = [],
          resultFlashcards = [],
          filteredFlashcards = [],
          testFlashcards = [],
          dictionaryFlashcards = [];
      var reason = {};
      applicationSession.getUserId(runId)
          .then(function (uid) {
             db.view('Views', 'flashcardsByUser', {key: uid, include_docs: true},
                 function (err, data) {
                    if (err) {
                      reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                      deferred.reject(reason);
                    }
                    else {
                       _.each(data.rows, function (flashcard) {
                          if (flashcard.doc.type === 'DictionaryTermStudy') {
                             flashcard.doc.question = flashcard.doc.termName;
                             dictionaryFlashcards.push(flashcard.doc);
                          }
                          else {
                             testFlashcards.push(flashcard.doc);
                          }
                       });

                      vocabulSearch.getAllCorrectDefinition(dictionaryFlashcards).then(function(response) {
                        if(response.status === config.businessFunctionStatus.ok){
                          dictionaryFlashcards = response.data;

                            testQuestionIds = _.pluck(testFlashcards, 'testQuestionId');
                            db.view('Views', 'testQuestionsById', {keys: testQuestionIds, include_docs: true},
                            function (err, data) {
                              if (err) {
                                reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                                deferred.reject(reason);
                              }
                              else {
                                resultFlashcards = _.map(data.rows, function (testQuestion, index) {
                                  return _.extend(testFlashcards[index], {
                                    question: testQuestion.doc.question,
                                    answer: testQuestion.doc.answer});
                                }).concat(dictionaryFlashcards);

                                var isFilter = reqData.filter && reqData.filter.length,
                                    isCorrectAnswersCount = reqData.correctAnswersCount && reqData.correctAnswersCount.length;
                                if ( isFilter || isCorrectAnswersCount )
                                {
                                  filteredFlashcards = _.filter(resultFlashcards, function (item) {
                                    var _filter = reqData.filter || null,
                                    regExp = new RegExp(_filter, 'gi'),
                                    _correctAnswersCount = parseInt(reqData.correctAnswersCount, 10);
                                    _correctAnswersCount = isNaN(_correctAnswersCount) ?  null : _correctAnswersCount;

                                    return (regExp.test(item.question) &&
                                      (item.correctAnswersCount === _correctAnswersCount || !isCorrectAnswersCount)) ||
                                      (item.correctAnswersCount === _correctAnswersCount && !isFilter);
                                  });

                                  deferred.resolve(filteredFlashcards);
                                }
                                deferred.resolve(resultFlashcards);
                              }
                            });
                       }
                       else{
                          reason = utils.addSeverityResponse(response.text, response.status);
                          deferred.reject(reason);
                       }
                      },deferred.reject);
                    }
                 });
          }, deferred.reject);

      return deferred.promise;
   };

   module.exports = {
      activate                 : activateStudy,
      initiate                 : initiateStudy,
      update                   : updateStudy,
      searchStudies            : searchStudies,
      add                      : addFlashcard,
      getAllByTerm             : getFlashCardsByTerm,
      searchAssignedFlashcards : searchAssignedFlashcards,

      searchTests              : searchTests,
      getAll                   : getAllFlashCards //Needed for Flashcards View, but not in UML
   };
})();