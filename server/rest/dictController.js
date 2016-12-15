/*jslint node: true */
'use strict';
var utils = require('../utils/utils.js');
var dictSearch = require('./dictSearch');
var flashcards = require('./studyFlashcards');
var appConfig = require(__dirname + '/../utils/configReader.js');
var unidecode = require('unidecode');
var _ = require('underscore');

var currentIndex = '';
var emptyDefinitionResponse = [];
var path;

var messageNotFoundDict = 'Dictionary not found.';
var messageFlashCardError = 'Problem with flashcards.';
var messageSendNotLetter = 'Text is selected incorrectly "';

module.exports = {
   GET : {
      search : function (req, res) {
        var criteria = req.param("criteria");
        var useDicts = JSON.parse(req.param("useDicts"));
        var numberTerms = req.param("numberTerms");
        var prefix = '', response = {};
        var error = appConfig.businessFunctionStatus.error;
        dictSearch.getDictConfig().then(function(dictConfig) {
          if (dictConfig.status ===  appConfig.businessFunctionStatus.ok) {
            path = dictConfig.data.path;
            currentIndex = criteria[0];
            criteria = criteria.toUpperCase();
            dictSearch.loadLetterIndexs(path, criteria[0], prefix, function(load) {
              if (load.loaded) {
                dictSearch.searchDictionaryTerms(criteria,  useDicts, numberTerms, path, prefix, function(response) {
                  res.send(response);
                });
              }
              else {
                res.send(load);
              }
            });
          }
          else {
            response = utils.addSeverityResponse(dictConfig.text, error);
            res.send(response);
          }
        }, function(reason) {
          reason = utils.addSeverityResponse(messageNotFoundDict, error);
          res.send(reason);
        });
      },
      definition : function (req, res) {
         var termName = req.param("termName");
         var letter = unidecode(termName[0]);
         var checkLetter = /\w/;
         var useDicts = JSON.parse(req.param("useDicts") || '{}');
         var runId = req.headers['x-run-id'] || '';
         var prefix = '';
         var dictName;
         var response = {};
         var error = appConfig.businessFunctionStatus.error;
         var getDefinition = function(dictionaryTermName, useDicts, path) {
            var query = {dictionaryTermName: dictionaryTermName};
              dictSearch.getDictionaryDefinition(query, path, useDicts, prefix).then(function(dictionaryResponse) {
              var dictionaryDefinition = {
                definitions: [],
                term: dictionaryResponse.term
              };
              var def = [];
                var responseDefinition = dictionaryResponse.definition;
                var term = dictionaryResponse.term;
                var isInFlashcards, partOfSpeech;
                  flashcards.getAllByTerm(runId, term).then(function(flashcardsArr){
                  _.each(responseDefinition, function(definitions, dictId) {
                     isInFlashcards = false;
                     _.map(definitions, function(definition, dictIndex) {
                        partOfSpeech = definition[term].grammar.partOfspeech || 'none';
                        isInFlashcards = _.some(flashcardsArr, function(flashcard) {
                          return flashcard.termName === term && flashcard.dictionaryId === dictId && flashcard.partOfSpeech === partOfSpeech;
                        });
                        def.push(_.extend(definition[term], {inFlashcards: isInFlashcards, index: dictIndex}));
                     });
                     dictionaryDefinition.definitions.push({dictName: dictName[dictId],definition: def});
                  });
                     res.send(dictionaryDefinition);
                  }, function(reason) {
                      reason = utils.addSeverityResponse(messageFlashCardError, error);
                      res.send(reason);
                  });
            },function(){
              res.send(emptyDefinitionResponse);
          });
        };
        dictSearch.getDictConfig().then(function(dictConfig) {
          if (dictConfig.status === appConfig.businessFunctionStatus.ok) {
            path = dictConfig.data.path;
            dictName = dictConfig.data.dictName;
            if (checkLetter.test(letter)) {
                dictSearch.loadLetterIndexs(path, letter, prefix, function(load) {
                  if (load.loaded) {
                    getDefinition(termName, useDicts, path);
            }
            else {
                    res.send(emptyDefinitionResponse);
                  }
                });
              }
              else {
                messageSendNotLetter = 'Text is selected incorrectly "' + letter + '".';
                response = utils.addSeverityResponse(messageSendNotLetter, error);
                res.send(response);
              }
            }
          else {
            response = utils.addSeverityResponse(dictConfig.text, error);
            res.send(response);
          }
        }, function(reason) {
          reason = utils.addSeverityResponse(messageNotFoundDict, error);
          res.send(reason);
        });
      }
   }/*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};