/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var appConfig = require(__dirname + '/../utils/configReader.js');

var flashcards = require('./studyFlashcards.js');
var vocabulSearch = require('./vocabularySearch');
var vocabulary = require('./vocabulary.js');

module.exports = {
   POST: {
      initiate: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.initiate(req.body, runId).then(
             function (data) {
                res.send(data);
             }, function (reason) {
                res.send(reason);
             });
      },
      update: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.update(req.body, runId).then(
             function () {
                res.send('Ok');
             }, function (reason) {
                res.send(reason);
             });
      },
      activate: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.activate(req.body, runId).then(
             function (data) {
                res.send(data);
             }, function (reason) {
                res.send(reason);
             });
      },
      add: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.add(req.body, runId).then(
             function () {
                res.send('Ok');
             }, function (reason) {
                res.send(reason);
             });
      }
   },
   GET: {
      searchStudies: function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         flashcards.searchStudies(runId).then(
             function (data) {
                res.send(data);
             }, function (reason) {
                res.send(reason);
             });
      },
      searchAssignedFlashcards: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.searchAssignedFlashcards(req.query, runId).then(
             function (data) {
                res.send(data);
             }, function (reason) {
                res.send(reason);
             });
      },

      getAll: function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         flashcards.getAll(runId).then(
             function (data) {
                res.send(data);
             }, function (reason) {
                res.send(reason);
             });
      },

      assesment: function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var numberGroups = parseInt(req.param('numberGroups'), 10);
         var incorrectNum = parseInt(req.param('incorrectNum'), 10);
         var path;
         flashcards.getByRunTime(runId).then(
             function (data) {
                if (data && data.length) {
                   vocabulary.getVocabularyPaths().then(function(pathResponse){
                    if(pathResponse.status  === appConfig.businessFunctionStatus.ok){
                      path = pathResponse.data[0]; //TO DO add work with many vocabula
                      vocabulSearch.loadIndexs(path, function() {
                        vocabulSearch.getIncorectAnswers(path, data, numberGroups, incorrectNum).then(function(response) {
                          res.send(response);
                        });
                      });
                    }
                    else{
                      res.send(pathResponse);
                    }
                   }, function(reason){
                    res.send(reason);
                   });
                }
                else {
                   res.send([]);
                }
             }, function (reason) {
                res.send(reason);
             });
      },

      searchTests: function(req, res) {
        var runId = req.headers['x-run-id'] || '';
        flashcards.searchTests(req.query.criteria, runId).then(
          function(data) {
            res.send(data);
          },
          function(err) {
            res.send(err);
          });
      }
   }
};