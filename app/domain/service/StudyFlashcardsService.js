define([
   'module',
   'swServiceFactory',
   'underscore'
], function (module, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$q', '$interval', 'swAgentService',
         function ($q, $interval, swAgentService) {
            var i,
                _interval,
                _listeners = [];

            this.initiateFlashcardsStudy = function (flashcardStudyIds) {
               var _reqObj = {
                  flashcardStudyIds : flashcardStudyIds
               };
               return request('post', 'StudyFlashcards', 'initiate', _reqObj)
                   .then(function(res) {
                      if (!swAgentService.isEnabled()) {
                         return res;
                      }
                      var questions = res.questions;
                      var terms = res.terms;

                      if (terms.length) {
                         return request('post', 'Vocabulary', 'createFlashcards', terms)
                             .then(function(res) {
                                return res.data;
                             })
                             .catch(function() {
                                var notAvailableOffline = 'This Flashcard is not available offline';
                                return terms.map(function(t) {
                                   return {
                                      _id: t._id,
                                      question: t.termName,
                                      answer: notAvailableOffline,
                                      incorrectAnswers: [notAvailableOffline, notAvailableOffline, notAvailableOffline]};
                                });
                             })
                             .then(function(res) {
                                var all = questions.concat(res);
                                return flashcardStudyIds.map(function(id) {
                                   return all.filter(function(obj) {
                                      return obj._id === id;
                                   })[0];
                                });
                             });
                      }

                      return questions;

                   });
            };

            this.updateFlashcardStudy = function (data) {
               var _reqObj = {
                  flashcardStudyId : data.flashcardStudyId || '',
                  passed           : Boolean(data.passed)
               };

               return request('post', 'StudyFlashcards', 'update', _reqObj);
            };

            this.activateTestQuestionsStudies = function (testId, publicationId) {
               var _reqObj = {
                  testId : testId,
                  publicationId: publicationId
               };

               return request('post', 'StudyFlashcards', 'activate', _reqObj);
            };

            this.addFlashcardStudy = function (data) {
               var _reqObj = {
                  dictionaryId       : data.dictionaryId,
                  dictionaryTermName : data.dictionaryTermName,
                  partOfSpeech       : data.partOfSpeech
               };

               return request('post', 'StudyFlashcards', 'add', _reqObj);
            };

            this.searchFlashcardStudies = function (extraCallback) {
               //swRestService.restRequest
               //debugger;//service provider - tested
               return swAgentService.request('get', 'StudyFlashcards', 'searchStudies', {})
                  .then(_onSuccessSearch, _onFailSearch);

               function _onSuccessSearch(result) {
                  if (extraCallback) {
                     extraCallback = result.data;
                  }
                  for (i = 0; i < _listeners.length; i++) {
                     _listeners[i](result.data);
                  }
                  return result.data;
               }

               function _onFailSearch() {
                  _listeners = [];
                  return [];
               }
            };

            this.addSearchFlashcardStudiesListener = function (data) {
               //debugger;//service client - tested
               // this.searchFlashcardStudies();
               // var self = this;
               // _interval = $interval(function () {
               //    swLongRunningOperation.suspend();
               //    self.searchFlashcardStudies();
               //    swLongRunningOperation.resume();
               // }, INTERVAL_TIME);
               for (i = 0; i < _listeners.length; i++) {
                  _listeners[i](data);
               }
            };

            this.removeSearchFlashcardStudiesListener = function () {
               $interval.cancel(_interval);
            };

            this.getSearchFlashcardStudies = function (listener) {
               _listeners.push(listener);
            };

            this.remGetSearchFlashcardStudies = function(_listener) {
               _.remove(_listeners, function(listener) {
                  return listener === _listener;
               });
            };

            //TODO: check if needed
            //no clients
            this.getFlashCardsList = function () {
               return request('get', 'StudyFlashcards', 'getAll', {});
            };

            //TODO: check for compliance with requirements
            this.searchTests = function (criteria) {
               var _requestData = {
                  criteria : criteria
               };

               return request('get', 'searchTests', 'getAll', _requestData);
            };

            this.searchAssignedFlashcards = function (itemsCount, filter, correctAnswersCount) {
               var _requestData = {
                  itemsCount          : itemsCount,
                  filter              : filter,
                  correctAnswersCount : correctAnswersCount
               };

               return request('get', 'StudyFlashcards', 'searchAssignedFlashcards', _requestData)
                   .then(function(res) {
                      if (!swAgentService.isEnabled()) {
                         return res;
                      }
                      var questions = res.questions;
                      var terms = res.terms;

                      if (terms.length) {
                         return request('post', 'Vocabulary', 'createFlashcards', terms)
                             .then(function(res) {
                                return res.data;
                             })
                             .catch(function() {
                                var notAvailableOffline = 'Not available offline';
                                terms.forEach(function(t) {
                                   t.answer = notAvailableOffline;
                                });
                                return terms;
                             })
                             .then(function(terms) {
                                return questions.concat(terms);
                             });
                      }

                      return questions;
                   });
            };

            function request(method, restPath, funcName, inData, params) {
               var deferred = $q.defer();
               //swRestService.restRequest
               //debugger;//service provider - tested
               swAgentService.request(method, restPath, funcName, inData, params)
                   .then(function (result) {
                      deferred.resolve(result.data);
                   }, function (reason) {
                      deferred.reject(reason);
                   });

               return deferred.promise;
            }
         }
      ]
   });
});