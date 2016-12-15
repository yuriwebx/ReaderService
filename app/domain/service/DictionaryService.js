
define([
   'module',
   'swServiceFactory',
   'underscore'
], function (module, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['$q','swDictionarySearch', 'swRestService', 'swAgentService',
         function ($q,swDictionarySearch, swRestService, swAgentService) {
            var indexUpload = false;
            var language;
            var usedLetter = 'init';
            var numbDict;
            var numbDif;
            var lengDicts;
            var numberTerms = 20;
            var currentWord = '';

            this.more = function(){
               numberTerms += 20;
            };

            this.initDictionary = function(lengParam) {
               language = lengParam;
               usedLetter = 'init';
               indexUpload = false;
               lengDicts = [];
               numberTerms = 20;
            };

            function compare(a, b) {
               return ((a === b) ? 0 : ((a > b) ? 1 : -1));
            }

            function getLocalTerm(word, indexUpload, numberTerms, result, deferred) {
               var key;
               if (indexUpload && word.length !== 0) {
                  swDictionarySearch.findTerm(word, indexUpload, numberTerms, function (respons) { //local request
                     key = Object.keys(respons)[0];
                     if (!_.isEmpty(result.termNames)) {
                        result.termNames = result.termNames.concat(respons[key]);
                        result.termNames = _.uniq(result.termNames);
                     }
                     else {
                        result.termNames = respons[key];
                     }
                     result.termNames.sort(compare);
                     deferred.resolve(result.termNames);
                  });
               }
               else {
                  result.termNames.sort(compare);
                  deferred.resolve(result.termNames);
               }
            }

            function getTermRequest(deferred, word, lengDicts) {
               //swRestService.restRequest
               //debugger;//service provider - tested
               swRestService.restSwHttpRequest('get', 'Dict', 'search', {
                  criteria: word,
                  useDicts: JSON.stringify(lengDicts),
                  numberTerms: numberTerms
               })
                  .then(function(result) {
                     getLocalTerm(word, indexUpload, numberTerms, result.data, deferred);
                  }, function() {
                     var res = {};
                     res.termNames = [];
                     getLocalTerm(word, indexUpload, numberTerms, res, deferred);
                  });
            }

            this.getDictionaryTerms = function(word) {
               var deferred = $q.defer();
               if(!currentWord || currentWord !== word){
                  numberTerms = 20;
               }
               currentWord =  word;
               swDictionarySearch.findLocalDict(language, function(respDicts) {
                  if (!respDicts) {
                     respDicts = [];
                  }
                  lengDicts = respDicts;
                  if (lengDicts.length !== 0) {
                     usedLetter = word[0];
                        lengDicts = respDicts;
                        swDictionarySearch.getIndexLetter(lengDicts, usedLetter, function(res) {
                           indexUpload = res;
                           getTermRequest(deferred, word, lengDicts, numberTerms);
                        });
                  }
                  else {
                     usedLetter = word[0];
                     getTermRequest(deferred, word, lengDicts, numberTerms);
                  }
               });
               return deferred.promise;
            };

            function dictionaryProcessing(data,term){
               var definitions = typeof data === 'object' ? data : [];
               var count = 0;
               if (definitions.length !== 0) {
                  for (var i = 0; i < definitions.length; i++) {
                     count += definitions[i].definition.length;
                  }
                  definitions.count = count;
               }
               else{
                  definitions = {};
                  definitions.count = 0;
               }
               definitions.term = term;
               return definitions;
            }

            function definition(term, indexUpload, result, lengDicts, deferred) {
               lengDicts = lengDicts;
               swDictionarySearch.findDefinition(term, indexUpload, function(respons) { //local request
                  for (var key in respons) {
                     if (_.isEmpty(result.termNames)) {
                        result.termNames = respons[key];
                     }
                  }
                  var findTerm = term;
                  result.termNames = dictionaryProcessing(result.termNames,findTerm);
                  deferred.resolve(result.termNames);
               });
            }

            function getLocalDefinition(term, indexUpload, result, lengDicts, deferred) {
               if (indexUpload && lengDicts.length !== 0) {
                  definition(term, indexUpload, result, lengDicts, deferred);
               }
               else if(lengDicts.length !== 0){
                  swDictionarySearch.findLocalDict(language, function(respDicts) {
                     if (!respDicts) {
                        respDicts = [];
                     }
                     lengDicts = respDicts;
                     if(lengDicts.length !== 0){
                        swDictionarySearch.getIndexLetter(lengDicts, term[0], function(res) {
                           definition(term, res, result, lengDicts, deferred);
                        });
                     }
                  });
               }
               else{
                  var findTerm = result.term;
                  result.definitions = dictionaryProcessing(result.definitions,findTerm);
                  deferred.resolve(result.definitions);
               }
            }

            this.getPart = function(data,term,tagStart,tagEnd){
               term = term ? term.toLowerCase() : '';
               data = data ? data : '';
               var response;
               var re;
               function escape(str) {
                  return String(str).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
               }
               if(data.toLowerCase() .indexOf(term) !== -1 && term.length > 2){
                  term = escape(term);
                  re = new RegExp('(\\w*' + term + '\\w*-\\w*)|(\\w*' + term + '\\w*)', 'gi');
                  response =  data.replace(re, function(data){return tagStart + data + tagEnd;});
               }
               else{
                  response = data;
               }
               return response;
            };

            this.getDictionaryDefinition = function(term)
            {
               var deferred = $q.defer();
               numbDict = 0;
               numbDif = 0;
               if(lengDicts){
                  //swRestService.restRequest
                  //debugger;//service provider - tested
                  getDefinition(term, lengDicts)
                  .then(function(result) {
                        getLocalDefinition(term, indexUpload, result.data, lengDicts, deferred);
                  }, function() {
                     var res = {};
                     res.termNames = [];
                     getLocalDefinition(term, indexUpload, res, lengDicts, deferred);
                  });
                  return deferred.promise;
               }
               else{
                  swDictionarySearch.findLocalDict(language, function(respDicts) {
                     if (!respDicts) {
                        respDicts = [];
                     }
                     lengDicts = respDicts;
                     //swRestService.restRequest
                     //debugger;//service provider - NOT TESTED
                     getDefinition(term, lengDicts)
                     .then(function(result) {
                        getLocalDefinition(term, indexUpload, result.data, lengDicts, deferred);
                     }, function() {
                        var res = {};
                        res.termNames = [];
                        getLocalDefinition(term, indexUpload, res, lengDicts, deferred);
                     });
                     return deferred.promise;
                  });
               }
            };

            function getDefinition(term, lengDicts){
               return swRestService.restSwHttpRequest('get', 'Dict', 'definition', {
                      termName: term,
                      useDict: JSON.stringify(lengDicts)
                   })
                   .then(function(res) {
                     var data = res.data;
                      return swAgentService.request('get', 'StudyFlashcards', 'all', {}, null, 'noop')
                          .then(function(cards) {
                             if (!cards.data) {
                                return res;
                             }
                             var cardsByTerm = cards.data.filter(function(c) {
                                return c.termName && c.termName === data.term;
                             });
                             checkIsInFlashcards(data, cardsByTerm);

                             return res;
                          });
                   });
            }

            function checkIsInFlashcards(data, cardsByTerm) {
               var definitions = data.definitions || {};

               var dictionaries = cardsByTerm.map(function(c) {
                  return c.dictionaryId;
               });

               var partsOfSpeech = cardsByTerm.map(function(c) {
                  return c.partOfSpeech;
               });

               definitions.forEach(function(def) {
                  var d = def.definition || [];
                  d.forEach(function(dd) {
                     if (dictionaries.indexOf(dd.dictionaryId) > -1 &&
                         partsOfSpeech.indexOf(dd.grammar.partOfspeech) > -1) {
                        dd.inFlashcards = true;
                     }
                  });
               });
            }
         }]
   });
});