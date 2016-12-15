/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var vocabulSearch = require('./vocabularySearch');
var config = require(__dirname + '/../utils/configReader.js');
var vocabulary = require('./vocabulary.js');
var applicationSession = require('./bl/applicationSessions');

module.exports = {
   GET : {
      getQuestions: function(req, res) {
        var lowerBound = parseInt(req.param("lowerBound"), 10);
        var upperBound = parseInt(req.param("upperBound"), 10);
        var numberQuestion = parseInt(req.param("numberQuestion"), 10);
        var numberIncorrectAnswers = parseInt(req.param("numberIncorrectAnswers"), 10);
        vocabulary.getVocabularyPaths().then(function(pathResponse) {
          if(pathResponse.status === config.businessFunctionStatus.ok){
            var path = pathResponse.data[0];
            vocabulSearch.loadIndexs(path, function(response) { //TO DO add work with many vocabula
              if (response.status === config.businessFunctionStatus.ok) {
                vocabulSearch.getVocabularyQuestions(path, lowerBound, upperBound, numberQuestion, numberIncorrectAnswers, function(resp) {
                  res.send(resp);
                });
              }
              else{
                res.send(response);
              }
            });
          }
          else{
             res.send(pathResponse);
          }
        }, function(reason) {
          res.send(reason);
        });
      },
      vocabularyResults: function (req, res) {
        var runId = req.headers['x-run-id'] || '';
        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onFailFilter);

        function _onSuccessFilter(uid) {
          return vocabulary.getResultUser(uid).then(function(response){
            res.send(response);
          });
        }

        function _onFailFilter(reason) {
          res.send(reason);
        }
      }
   },
   POST : {
      saveVocabulary: function (req, res) {
        var runId = req.headers['x-run-id'] || '';
        vocabulary.saveVocabularyResults(runId, req.body).then(function(response){
          res.send(response);
        },function(reason){
          res.send(reason);
        });
      },
      sendEmail: function (req, res) {
        var language = 'en';
        var profile = {
          name: req.body.name,
          comment: req.body.comment,
          vocabularyAssessment: req.body.result,
          methodName: req.body.methodName
        };
        var logVocabulary = req.body.logVocabulary;
        if (config && config.environment_name && config.environment_name.indexOf('public') === 0) { //temporary hack
          profile.email = config.emailForVocabularyResulstLive;
          vocabulary.sendEmail(profile, logVocabulary, language);
        }
        profile.email = config.emailForVocabularyResulstDevelop;
        vocabulary.sendEmail(profile, logVocabulary, language).then(function(response){
          res.send(response);
        },function(reason){
          res.send(reason);
        });
      },
     createFlashcards: function(req, res) {
       var runId = req.headers['x-run-id'] || '';
       applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onFailFilter);

       function _onSuccessFilter() {
         return vocabulSearch.createFlashcards(req.body).then(function(response){
           res.send(response);
         });
       }

       function _onFailFilter(reason) {
         res.send(reason);
       }
     }
   }
   /*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};