/* global module: true*/
/*jslint node: true */
/*jshint unused: vars*/
/*jslint camelcase: false */
// //sorting results
// var sort = require('./sort_results');
(function () {
   'use strict';
   require(__dirname + '/../serverScripts/amd-loader/amd-loader.js');
   var fs = require('fs');
   var _ = require('underscore');
   var unidecode = require('unidecode');
   var _str = require("underscore.string");
   var q = require('q');
   var arabicstemmer = require('arabicstemmer');
   var farsistemmer = require('farsistemmer');
   var natural = require('natural');
   var XRegExp = require('../../framework/lib/xregexp/xregexp-all.js').XRegExp;
   var handlebars = require('handlebars');
   var handlebarsTemplate = null;
   arabicstemmer.init();
   farsistemmer.init();

   var config = require(__dirname + '/../utils/configReader.js');
   var searchUtils = require(__dirname + '/searchUtils');
   var searchCommonUtils = require('../../shared/searchUtils');

   var sort = require(__dirname + '/sort_results');
   var utils = require('../utils/utils.js');
   var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

   var clientsToFacet = {ool : 'ocean_of_lights'}; // Should be moved to outer config!
   module.exports = function (prvd) {

      var providers = prvd;
      /**
       * @param  {string} clientID
       * @return {Object} provider
       */
      function getProviderByClientID(clientID) {
        var provider;
        if (clientID && clientsToFacet[clientID] && providers[clientsToFacet[clientID]]) {
           provider = providers[clientsToFacet[clientID]];
        }
        else {
           if(clientID){
              logger.error('ClientID: ' + clientID + ' not found');
           }
           provider = providers.default;
        }
        return provider;
      }

      /**
       * @param  {string} query
       * @param  {Object} params consist of language, optional bookId clientID publicationPath
       * @param  {runId} runId optional
       * @return {Object} searchResult
       */
      function search(query, params, runId) {
         var deferred = q.defer();
         var searchResult = {
               rows : [],
               stems : []
            },
            queryParamsDef = {
               quotes : [],
               notWords : [],
               metaData : [],
               standAloneWords : [],
               quotesWords : [],
               phonemeWords : []
            },
            queryParams = {};

         params = params || {
            lang : 'en'
         }; // default language if no one is set

         var provider =  getProviderByClientID(params.clientID);
         var sortTestFunc;
         if (params.publicationPath && !params.bookId) {
            sortTestFunc = function (el) {
               return (el.originalPath && el.originalPath.htm && params.publicationPath.indexOf(el.originalPath.htm) > -1);
            };
         }

         queryParams = parseQuery(query, params.lang);
         _.defaults(queryParams, queryParamsDef);


          var isValidQueryMeta = provider.validateQueryMeta(queryParams.metaData, params.lang);
          if (!isValidQueryMeta) {
            deferred.resolve(searchResult);
            return deferred.promise;
          }

         if (!params.lang || (queryParams.standAloneWords.length === 0 && queryParams.quotesWords.length === 0 && queryParams.phonemeWords.length === 0)) {
            deferred.resolve(searchResult);
            return deferred.promise;
         }

         searchEngine(queryParams, params, provider)
            .then(function (searchResponse) {
               var sentences = searchResponse.sentences;
               var booksMeta = [],
                  bookIds = [];

               bookIds = getUniqParams(sentences, 'bookId');
               booksMeta = provider.getBooksByIdsAssoc(bookIds, queryParams.metaData, params.lang);
               if (params.bookId.length === 0 && sentences.length !== 0) {
                  return createBookList(sentences, booksMeta, runId, sortTestFunc);
               }
               else if (params.bookId.length > 0 && sentences.length !== 0) {
                  return createSentencesListByPublication(
                     sentences, booksMeta,
                     queryParams.quotes, searchResponse.searchWords,
                     params.lang, provider
                  );
               }
               else {
                  deferred.resolve(searchResult);
               }
            })
            .then(function (searchResponse) {
               deferred.resolve(searchResponse);
            }, function (err) {
               dummy(err, deferred);
            });

         return deferred.promise;
      }
      /**
       * @param  {string} start is position in bytes of sentence objects in file sentences.json
       * @param  {string} len is length in byts of sentence object in file sentences.json
       * @param  {string} clientID
       * @return {object} moreTextResponse is object include html with more text for search result
       */
      function getMoreText(start, len, clientID) {
        var provider =  getProviderByClientID(clientID);
        var moreTextResponse = {
         text: ''
        };

        return provider.readSentencesObjects(start, len)
           .then(function(sentencesObjects){
               var groupedSentencesObjects = groupSentencesObjectsByParagraph(sentencesObjects);
               moreTextResponse.text = _.map(groupedSentencesObjects, function(groupedSentencesObject){
                 return createHTML(groupedSentencesObject.paragraphText, groupedSentencesObject.paragraphs);
               }).join('');
               return moreTextResponse;
           })
           .catch(function() {
             return moreTextResponse;
           });
      }

      function groupSentencesObjectsByParagraph(sentencesObjects) {
         var groupedSentencesObjects = [];
         var currentSentencesObjects = sentencesObjects.shift();
         currentSentencesObjects.paragraphText = currentSentencesObjects.text;
         _.each(sentencesObjects, function(sentencesObject) {
            if (currentSentencesObjects.locator === sentencesObject.locator) {
               currentSentencesObjects.paragraphText += ' ' + sentencesObject.text;
            }
            else {
               groupedSentencesObjects.push(currentSentencesObjects);
               currentSentencesObjects = _.clone(sentencesObject);
               currentSentencesObjects.paragraphText = sentencesObject.text;
            }
         });
         groupedSentencesObjects.push(currentSentencesObjects);
         return groupedSentencesObjects;
      }

      function createHTML(text, paragraph) {
         return '<p data-id="' + (paragraph || '') + '">' + text + ' </p>';
      }

      /**
       * @param  {String} query is search query
       * @param  {String} lang current language in search query
       * @return {Object} queryParams parse search query
       */
      function parseQuery(query, lang) {
         var quotesWords,
            blackList,
            standAloneWords,
            phonemeWords;
         var parsedQuery = searchCommonUtils.parseQuery(query, config.searchConfig, lang);

         standAloneWords = getStems(parsedQuery.standAloneWords.join(' '), 'en');
         if(lang === 'ar' || lang === 'fa'){
            [].push.apply(standAloneWords, getStems(parsedQuery.standAloneWords.join(' '), lang));
         }

         phonemeWords = getPhonemeWords(query, lang);

         quotesWords = getStems(parsedQuery.quotes.join(' '), lang);
         blackList = _.map(parsedQuery.blackList, function(word) {
            return word.replace(/^\s*-/, '').trim();
         });
         blackList = tokenizing(blackList.join(' '), lang);
         blackList = removeStopWord(blackList, lang);
         return {
            quotes: parsedQuery.quotes,
            notWords: blackList,
            metaData: parsedQuery.metaData,
            standAloneWords: standAloneWords,
            quotesWords: quotesWords,
            phonemeWords: phonemeWords
         };
      }

      /**
       * @param  {Object} queryParams parsed quary
       * @param  {Object} params quaru params
       * @param  {Object} provider perform access to search index
       * @return {Object} searchResult
       */
      function searchEngine(queryParams, params, provider) {
         var phoneticWords = [];
         var _stemSentences = [];
         var intersection = [];
         var wordForms = [];
         var phoneticCodes = [];

         var positiveSearch = queryParams.standAloneWords.concat(queryParams.quotesWords);
         var phoneticBlackList = queryParams.quotesWords;
         return q.all([performSearch(positiveSearch, provider, params.lang, true, phoneticBlackList),
                       performSearch(queryParams.notWords, provider, params.lang, false)])
           .spread(function(positiveSentence, negativeSentence){

            phoneticWords = positiveSentence.notFoundWords.soundEx.concat(positiveSentence.notFoundWords.ipa);
            phoneticCodes = createPhoneticCodes(positiveSentence.notFoundWords.soundEx, params.lang);

            negativeSentence.array = utils.uniqueElements(Array.prototype.concat.apply([], negativeSentence.array));
            if (params.bookId && negativeSentence.array.length !== 0) {
               negativeSentence.array = filterByBookId(negativeSentence.array, params.bookId);
            }

            if(params.lang === 'en' || positiveSentence.spliteIndex === positiveSentence.array.length) {
               intersection = intersectBookIds(positiveSentence.array, params.bookId);
            }
            else {
               intersection = filterByBookId(Array.prototype.concat.apply([], positiveSentence.array), params.bookId);
               intersection = utils.uniqueElements(intersection);
            }

            if (!params.bookId && phoneticWords.length === 0 && queryParams.quotesWords.length === 0) {
               positiveSentence.array = filterSearchArrayByBlackList(intersection, negativeSentence.array);
               return {
                  sentences: _getSentenceIds(positiveSentence.array),
                  searchWords: []
               };
            }
            else {
               positiveSentence.array = filtredIntersection(positiveSentence.array, intersection);
               var stems = filterSearchArrayByBlackList(flatten(positiveSentence.array.slice(0, positiveSentence.spliteIndex)), negativeSentence.array);
               var phonemes = filterSearchArrayByBlackList(flatten(positiveSentence.array.slice(positiveSentence.spliteIndex)), negativeSentence.array);
               stems = filterSearchArrayByBlackList(stems, phonemes);
               var stemsMoreText = [];
               var phonemesMoreText = [];
               if (!_.isEmpty(positiveSentence.moreTextDict)) {
                 stemsMoreText = _.map(stems, function(stem){
                    return positiveSentence.moreTextDict[stem];
                 });
                 phonemesMoreText = _.map(phonemes, function(phoneme){
                    return positiveSentence.moreTextDict[phoneme];
                 });
               }
               return q.all([provider.getSentencesByIds(stems, 'stem'),
                             provider.getSentencesByIds(phonemes, 'phoneme')
                  ])
                  .spread(function(stemSentences, phonemeSentences) {
                     if (stemsMoreText.length) {
                      stemSentences = addedMoreTextIndex(stemSentences, stemsMoreText);
                     }
                     if (phonemesMoreText.length) {
                      phonemeSentences = addedMoreTextIndex(phonemeSentences, phonemesMoreText);
                     }

                     var searchWords = [];
                     _stemSentences = stemSentences;
                     searchWords = positiveSearch.concat(phoneticCodes);
                     _.each(searchWords, function(word){
                        [].push.apply(wordForms, _.keys(provider.getWordFormsByWord(params.lang, word)));
                     });
                     if(phonemeSentences.length !== 0){
                        if (params.lang === 'ar' || params.lang === 'fa') {
                           [].push.apply(searchWords, generateArabicSearchStems(positiveSentence.notFoundWords.ipa, params.lang));
                           return {
                              filtredSentences: phonemeSentences,
                              searchWords: searchWords
                           };
                        }
                        else if (params.lang === 'en'){
                           return q.when(phoneticFilter(phonemeSentences, wordForms, phoneticWords, params.lang, provider, params.bookId));
                        }
                     }
                  })
                  .then(function(filtredObj) {
                     var searchWords = queryParams.standAloneWords;
                     if(filtredObj && filtredObj.filtredSentences) {
                         [].push.apply(_stemSentences, filtredObj.filtredSentences);
                     }

                     if(filtredObj && filtredObj.searchWords) {
                        [].push.apply(searchWords, filtredObj.searchWords);
                     }

                     _stemSentences = filterSentenseByQuotes(_stemSentences, queryParams.quotes, params.lang);

                     return {
                        sentences : _stemSentences,
                        searchWords: searchWords
                     };
                  });
            }
         });
      }

      /**
       * @param  {Array} sentences
       * @param  {Object} booksMeta
       * @param  {string} runId
       * @param  {function} sortTestFunc
       * @return {finalBookList} finalBookList
       */
      function createBookList(sentences, booksMeta, runId, sortTestFunc) {
         var deferred = q.defer();
         var rawBooksList,
            booksData;

         var finalBookList = {
            rows : []
         };

         var booksDataObj = {};
         _.each(sentences, function (sentence) {
            if (booksDataObj[sentence.bookId]) {
               booksDataObj[sentence.bookId].total_rows += 1;
            }
            else {
               booksDataObj[sentence.bookId] = {
                  bookId : sentence.bookId,
                  total_rows : 1
               };

            }
         });
         booksData = _.values(booksDataObj);

         rawBooksList = _.filter(booksData, function (book) {
            return booksMeta[book.bookId];
         }).map(function (book) {
            var priority,
               bookAuthor = '<empty>'; //TODO: remove when all author in meta

            var originalHtm = booksMeta[book.bookId].doc.meta.originalHtm,
               originalPdf = booksMeta[book.bookId].doc.meta.originalPdf,
               originalDoc = booksMeta[book.bookId].doc.meta.originalDoc,
               emptyOriginalPath = {
                  htm : '',
                  pdf : '',
                  doc : ''
               };

            var originalPath = originalHtm || originalPdf || originalDoc ? {
               htm : originalHtm || '',
               pdf : originalPdf || '',
               doc : originalDoc || ''
            } : emptyOriginalPath;

            if (booksMeta[book.bookId].doc.meta.author) {
               bookAuthor = unidecode(booksMeta[book.bookId].doc.meta.author);
               bookAuthor = bookAuthor.replace(/\W+/g, '').replace(/\s+/g, '').toLowerCase();
            }
            priority = parseInt(booksMeta[book.bookId].doc.meta.priority, 10);
            priority = isNaN(priority) ? 0 : priority;
            return {
               _id : booksMeta[book.bookId].doc.globalId,
               bookId : book.bookId,
               type : _str.capitalize(booksMeta[book.bookId].doc.meta.type), //TODO: remove capitalize after fix in lib-processor
               title : booksMeta[book.bookId].doc.bookName,
               author : booksMeta[book.bookId].doc.meta.author,
               cover : booksMeta[book.bookId].doc.meta.cover,
               totalResults : book.total_rows,
               originalPath : originalPath,
               priority : priority
            };
         });

         if (rawBooksList.length === 0) {
            deferred.resolve(finalBookList);
         }
         else {
            sort.sortBook(rawBooksList, runId, sortTestFunc).then(function (result) {
               finalBookList.rows = result;
               deferred.resolve(finalBookList);
            }, deferred.reject);
         }
         return deferred.promise;
      }

      /**
       * @param  {Array} sentences
       * @param  {Object} booksMeta
       * @param  {Array} quotes
       * @param  {Array} searchWords
       * @param  {string} lang
       * @param  {Object} provider
       * @return {Array} sentencesList
       */
      function createSentencesListByPublication(sentences, booksMeta, quotes, searchWords, lang, provider) {
         var deferred = q.defer();
         var stems = [],
            quoteWords = [];

         var sentencesList = {
            rows : [],
            stems : [],
            quotes : []
         };
         sentencesList.rows = sentences;
         var wordForms = flatten(_.map(searchWords, function(word){
            return _.keys(provider.getWordFormsByWord(lang, word));
         }));
         stems = filterStemsBySentences(sentences, wordForms, lang);
         sentencesList.rows = _.filter(sentencesList.rows, function (sentenceData) {
            return _.has(booksMeta, sentenceData.bookId);
         })
            .map(function (sentenceData) {
               return _.extend(sentenceData, {
                  bookId : booksMeta[sentenceData.bookId].doc.globalId,
                  bookName : booksMeta[sentenceData.bookId].doc.bookName,
                  localId : booksMeta[sentenceData.bookId].doc._id
               });
            });

         quoteWords = _.map(quotes, function(quote) {
            var words = tokenizing(quote.toLowerCase(), lang);
            return _.map(words, function(word) {
               var cleanWord = replaceDiacritic(word, lang);
               var stem = stemmer(cleanWord, lang);
               var forms = [];
               var wordForms = provider.getWordFormsByWord(lang, stem);
               if(!_.isEmpty(wordForms)){
                 var quoteWordForms = filteredWordsByDiacritic(_.keys(wordForms), cleanWord.toLowerCase(), lang);
                 forms = forms.concat(quoteWordForms, [word, cleanWord]);
               }
               else{
                  forms = [word, cleanWord];
               }
               return utils.uniqueElements(forms);
            });
         });
         sentencesList.quotes = quoteWords || [];
         sentencesList.stems = utils.uniqueElements(stems);
         sentencesList = sort.sortSentence(sentencesList, quotes, lang);
         deferred.resolve(sentencesList);
         return deferred.promise;
      }

      /**
       * @param  {Array} words
       * @param  {Object} provider
       * @param  {string} lang
       * @param  {Boolean} isNeedNotFoundWords
       * @param  {Array} phoneticBlackList
       * @return {Object} sentenceResults
       */
      function performSearch(words, provider, lang, isNeedNotFoundWords, phoneticBlackList){
         var searchStems = createSearchArray(lang, words),
             sentenceWordsDict = {},
             moreTextDict = {},
             phoneticMoreTextDict = {},
             notFoundWords = [],
             phoneticCodes = [],
             intersectStem = [],
             intersectPhoneme = [],
             wordsBySoundType = {
               soundEx: [],
               ipa: []
            };
         phoneticBlackList = phoneticBlackList || [];
         var MAX_LENGHT_IPA_WORD = 8;
         return getWordObjects(searchStems, 'stem', provider)
         .then(function(searchResponse){
            sentenceWordsDict = createWordsDict(searchResponse.searchResults);
            moreTextDict = createMoreTextDict(searchResponse.searchResults);
            notFoundWords = _.filter(searchResponse.notFoundWords, function(word) {
               return phoneticBlackList.indexOf(word) === -1;
            });
            intersectStem = groupedWords(sentenceWordsDict, searchStems);
            if (notFoundWords.length !== 0) {
               if (lang === 'ar' || lang === 'fa') {
                  wordsBySoundType = groupedWordByLength(notFoundWords, MAX_LENGHT_IPA_WORD);
               }
               else if (lang === 'en') {
                  wordsBySoundType = {
                     soundEx: notFoundWords
                  };
               }
               else {
                  throw new Error('Language not found in function performSearch');
               }
               _.defaults(wordsBySoundType, {soundEx: [], ipa: []});
               phoneticCodes = createSearchArray(lang, createPhoneticCodes(wordsBySoundType.soundEx, lang));
               return getWordObjects(phoneticCodes, 'phoneme', provider)
                     .then(function(searchResponse){
                        var phoneticWordsDict = createWordsDict(searchResponse.searchResults);
                        phoneticMoreTextDict  = createMoreTextDict(searchResponse.searchResults);
                        intersectPhoneme = groupedWords(phoneticWordsDict, phoneticCodes);
                        if(lang === 'ar' || lang === 'fa') {
                           return searchByGenerateArabicWords(wordsBySoundType.ipa, lang, provider);
                        }
                     })
                     .then(function(searchResponse){
                        if(searchResponse && searchResponse.ipaIntersectPhoneme.length) {
                           [].push.apply(intersectPhoneme, searchResponse.ipaIntersectPhoneme);
                           _.extend(phoneticMoreTextDict, searchResponse.ipaPhoneticMoreTextDict);
                        }
                        _.extend(moreTextDict, phoneticMoreTextDict);
                        return createSentenceResults(intersectStem, intersectPhoneme, moreTextDict, wordsBySoundType, isNeedNotFoundWords);
                     });
            }
            return createSentenceResults(intersectStem, intersectPhoneme, moreTextDict, wordsBySoundType, isNeedNotFoundWords);
         });
      }


      /*
        secondary functions
      */


     /**
      * @param  {Array} sentencesArray
      * @param  {object} moreTextIndexes
      * @return {Array} sentencesArray
      */
      function addedMoreTextIndex(sentencesArray, moreTextIndexes) {
         sentencesArray = _.map(sentencesArray, function(sentencObj, index){
            var searchIndex = searchUtils.parseSearchIndex(moreTextIndexes[index]);
            sentencObj.moreTextIndex = {
               start: searchIndex[0],
               len: searchIndex[1],
            };
            return sentencObj;
         });
         return sentencesArray;
      }

      /**
       * @param  {Array} searchWords
       * @param  {string} lang
       * @param  {Object} provider
       * @return {Object} searchResponse
       */
      function searchByGenerateArabicWords(searchWords, lang, provider){
         var phoneticWords = tokenizing(searchWords.join(' '), 'en');
         if (phoneticWords.length === 0) {
            return [];
         }

         var stems = generateArabicSearchStems(phoneticWords, lang);

         var searchStems = createSearchArray(lang, stems);
         return getWordObjects(searchStems, 'stem', provider)
            .then(function(phoneticResponse){
               if(phoneticResponse.length !== 0){
                  var phoneticWordsDict = createWordsDict(phoneticResponse.searchResults);
                  var intersectPhoneme = groupedWords(phoneticWordsDict, searchStems);
                  var ipaPhoneticMoreTextDict  = createMoreTextDict(phoneticResponse.searchResults);
                  return {
                     ipaIntersectPhoneme: intersectPhoneme,
                     ipaPhoneticMoreTextDict: ipaPhoneticMoreTextDict
                  };
               }
               else {
                  return {
                     ipaIntersectPhoneme: [],
                     ipaPhoneticMoreTextDict: {}
                  };
               }
            });
      }

      /**
       * @param  {Array} phoneticWords
       * @param  {string} lang
       * @return {Array} stems
       */
      function generateArabicSearchStems(phoneticWords, lang) {
         if (phoneticWords.length === 0) {
            return [];
         }
         var arabicWords = searchUtils.generateWord(phoneticWords, 'ar');
         var allForms = Array.prototype.concat.apply([], _.values(arabicWords));
         allForms = utils.uniqueElements(allForms);
         var stemsDict = {};
         _.each(allForms, function(word) {
            stemsDict[stemmer(word, lang)] = null;
         });
         var stems = _.keys(stemsDict);
         return stems;
      }

      /**
       * @param  {Array} intersectStem
       * @param  {Array} intersectPhoneme
       * @param  {Array} moreTextDict
       * @param  {Array} notFoundWords
       * @param  {Boolean} isNeedNotFoundWords
       * @return {Object} searchResults
       */
      function createSentenceResults(intersectStem, intersectPhoneme, moreTextDict, notFoundWords, isNeedNotFoundWords) {
         var searchResults = createСompositeArray(intersectStem, intersectPhoneme);
         searchResults.moreTextDict = moreTextDict;
         if(isNeedNotFoundWords) {
            searchResults.notFoundWords = notFoundWords;
         }
         return searchResults;
      }

      /**
       * @param  {Array} firstArray
       * @param  {Array} secondArray
       * @return {Object} compositeArray
       */
      function createСompositeArray(firstArray, secondArray) {
         var spliteIndex = firstArray.length;
         return {
            array :  firstArray.concat(secondArray),
            spliteIndex : spliteIndex
         };
      }

      /**
       * @param  {string} language
       * @param  {Array} words
       * @return {Array} searchArray
       */
      function createSearchArray(language, words) {
         return _.map(words, function(word) {
            return language + '_' + word;
         });
      }

      /**
       * @param  {Array} searchArray consist of search index
       * @param  {string} filePrefix set type of search stem or phoneme
       * @param  {Object} provider perform access to search index
       * @return {Object} searchResponse
       */
      function getWordObjects(searchArray, filePrefix, provider) {
         if (searchArray.length === 0) {
            return q({
               searchResults: [],
               notFoundWords: []
            });
         }
         return provider.getSentencesIndex(searchArray, filePrefix);
      }

      /**
       * @param  {Object} searchResults
       * @return {Object} wordsDict by sentences
       */
      function createWordsDict(searchResults){
         var wordsDict = {};
         _.each(searchResults, function(searchResult){
            if(!_.has(wordsDict, searchResult.key)){
               wordsDict[searchResult.key] = [];
            }
            wordsDict[searchResult.key].push(searchResult.value);
         });
         return wordsDict;
      }

      /**
       * @param  {[type]} searchResults
       * @return {[type]} moreTextDict is dicrionary sentence by more text index
       */
      function createMoreTextDict(searchResults) {
         var sentenceIndexes = flatten(_.pluck(searchResults, 'value'));
         var moreTextIndexes = flatten(_.compact(_.pluck(searchResults, 'moreTextIndex')));
         var moreTextDict = {};
         if(sentenceIndexes.length && moreTextIndexes.length) {
           moreTextDict = _.object(sentenceIndexes, moreTextIndexes);
         }
         return moreTextDict;
      }

      /**
       * @param  {Object} wordsDict
       * @param  {Array} searchWords
       * @return {Array} intersect filtred sentences by search words
       */
      function groupedWords(wordsDict, searchWords){
         var intersect = [];
         _.each(searchWords, function(searchWord){
            if (_.has(wordsDict, searchWord)) {
               [].push.apply(intersect, wordsDict[searchWord]);
            }
         });
         return intersect;
      }

      /**
       * @param  {Array} notFoundWords
       * @param  {Number} maxLength
       * @return {Object} notFoundWords group by length
       */
      function groupedWordByLength(notFoundWords, maxLength) {
         return _.groupBy(notFoundWords, function(notFoundWord) {
            return tokenizing(notFoundWord, 'en').join('').length > maxLength ? 'soundEx' : 'ipa';
         });
      }

      /**
       * @param  {Array} words
       * @param  {string} lang
       * @return {Array} create phonetic searchArray
       */
      function createPhoneticCodes(words, lang){
         var phoneticWords = [];
         _.each(words, function(word){
            [].push.apply(phoneticWords, word.split('-'));
         });

         var phoneticCodes = _.map(phoneticWords, function (word) {
            word = replaceDiacritic(word, lang);
            return getPhoneme(word, lang);
         }).filter(Boolean);
         return phoneticCodes;
      }

      /**
       * @param  {Array} intersect
       * @param  {string} bookId
       * @return {Array} intersect filtered and grouped intersect by bookId
       */
      function intersectBookIds(intersect, bookId) {
         if (intersect.length === 1) {
            intersect = _.first(intersect);
            if(bookId) {
              intersect = filterByBookId(intersect, bookId);
            }
            return intersect;
         }

         intersect = arrayIntersect(intersect, bookId);
         return intersect;
      }

      /**
       * @param  {Array} indexArray
       * @param  {string} bookId
       * @return {Array} filtredArray
       */
      function filterByBookId(indexArray, bookId) {
         var filtredArray = _.filter(indexArray, function(item){
           return bookId === item.substr(0, bookId.length);
         });
         return filtredArray;
      }

      /**
       * @param  {Array} intersect
       * @param  {string} bookId
       * @return {Array} intersectResponse intersect search result by search words
       */
      function arrayIntersect(intersect, bookId) {
         var i, shortest, nShortest, n, len, intersectResponse = [],
            obj = {},
            nOthers;
         nOthers = intersect.length - 1;
         nShortest = intersect[0].length;
         shortest = 0;
         for (i = 0; i <= nOthers; i++) {
            n = intersect[i].length;
            if (n < nShortest) {
               shortest = i;
               nShortest = n;
            }
         }

         if(bookId) {
            intersect[shortest] = filterByBookId(intersect[shortest], bookId);
         }

         for (i = 0; i <= nOthers; i++) {
            n = (i === shortest) ? 0 : (i || shortest); //Read the shortest array first. Read the first array instead of the shortest
            len = intersect[n].length;
            for (var j = 0; j < len; j++) {
               var elem = intersect[n][j];
               if (obj[elem] === i - 1) {
                  if (i === nOthers) {
                     intersectResponse.push(elem);
                     obj[elem] = 0;
                  }
                  else {
                     obj[elem] = i;
                  }
               }
               else if (i === 0) {
                  obj[elem] = 0;
               }
            }
         }
         return intersectResponse;
      }

      /**
       * @param  {Error} err current err object
       * @param  {Deferred} def curretn deferred
       * @return {undefined}
       */
      function dummy(err, def) {
         logger.warn('Search: ' + err, true);
         def.reject();
      }

      /**
       * @param  {string} query is search query
       * @param  {string} lang current language in search query
       * @return {Array} phonemeWords Array consist of Strings which can be words for phonetic search
       */
      function getPhonemeWords(query, lang) {
         var phonemeWords = query.toLowerCase().split(/\s+/);
         phonemeWords = removeStopWord(phonemeWords, lang);
         phonemeWords = _.filter(phonemeWords, function (phoneme) {
            return phoneme.length > 1;
         });
         return phonemeWords;
      }

      /**
       * @param  {Array} items is Array of Objects
       * @param  {string} property is name of property what needed
       * @return {Array} items Array of Strings unique propertys
       */
      function getUniqParams(items, property) {
         return utils.uniqueElements(_.map(items, function (item) {
            return item[property];
         }));
      }
      /**
       * @param  {Array} sentencesArray is consist of sentence Objects
       * @param  {Array} quotes consist of Array of Strings quotes which parsed from search query
       * @param  {string} lang is current language in search query
       * @return {Array} sentencesArray is filtered sentencesArray by quotes
       */
      function filterSentenseByQuotes(sentencesArray, quotes, lang) {
         if (quotes && quotes.length === 0) {
            return sentencesArray;
         }

         var quotesWords = getQuoteWords(quotes, lang);
         var quoteReArr = _.map(quotesWords, function (quoteWords ,index) {
            var cleanQuote = replaceDiacritic(quoteWords.join(' '), lang);
            return searchUtils.getQuoteRe(cleanQuote, lang, 'i');
         });
         sentencesArray = _.filter(sentencesArray, function (sentencObj) {
            var normalizeSentence = replaceDiacritic(sentencObj.sentence, lang);
            var allQuotesInSentence = _.every(quotes, function (quote, index) {
               var quoteRe = quoteReArr[index];
               return quoteRe.test(normalizeSentence); //exact match
            });
            return allQuotesInSentence;
         });
         return sentencesArray;
      }

       /**
       * @param  {Array} quotes Array of Strings, found quotes in search query
       * @param  {string} lang current language in search query
       * @return {Array} quotes Array of Array consist of Strings
       */
      function getQuoteWords(quotes, lang) {
         //"exile in 1868"
         quotes = _.map(quotes, function (quote) {
            quote = quote.replace(/\s{2,}/g, ' ').split(' ');
            quote = _.map(quote, function (word) {
               if (searchUtils.isDigit(word)) {
                  return word;
               }
               else {
                  return tokenizing(word, lang);
               }
            });
            quote = _.flatten(quote);
            return quote;
         });
         return quotes;
      }

      /**
       * @param  {Array} forms is Array consist of Strings word forms
       * @param  {Array} targetWords is Array consist of Strings target words
       * @return {Array} forms is filtered forms by target words
       */
      function levenshteinFilter(forms, targetWords) {
         forms = _.filter(forms, function (word) {
            var approvedWords = _.filter(targetWords, function (targetWord) {
               var lev = _str.levenshtein(targetWord, word.normalized);
               return lev < Math.round(targetWord.length * 0.5);
            });
            return approvedWords.length === targetWords.length;
         });
         return forms;
      }
      /**
       * @param  {Array} sentences is Array consist of sentence Objects
       * @param  {Array} forms is Array consist of Strings word forms
       * @param  {Array} phoneticWords
       * @param  {string} lang is current language in search query
       * @return {Object} filtredObj
       */
      function phoneticFilter(sentences, forms, phoneticWords, lang) {
         var phoneticCodes = createPhoneticCodes(phoneticWords, lang);
         var standAloneWordRe = /<default>/;
         var wordsLevenshtein = _.map(forms, function (word) {
            return {
               original : word,
               normalized : replaceDiacritic(word, lang)
            };
         });

         var filteredForms = levenshteinFilter(wordsLevenshtein, phoneticWords, lang);
         if (filteredForms.length > 0) {
            forms = _.map(filteredForms, function(form){
               return form.original;
            });
         }

         if (forms.length !== 0) {
            standAloneWordRe = searchUtils.getWordsFormRe(forms, lang, 'i');
         }

         sentences = _.filter(sentences, function (sentencData) {
            var normalizedSentence = replaceDiacritic(sentencData.sentence, lang);
            return standAloneWordRe.test(normalizedSentence);
         });
         return {
            filtredSentences: sentences,
            searchWords: phoneticCodes
         };
      }

      // var getWordsWithDiacritic = function (sentences, stems, lang) {
      //    var stemDict = {};
      //    _.each(stems, function (wordForm) {
      //       var stem = stemmer(wordForm, lang);
      //       if (stemDict[stem]) {
      //          stemDict[stem].push(wordForm);
      //       }
      //       else {
      //          stemDict[stem] = [wordForm];
      //       }
      //    });

      //    _.each(sentences, function (sentencObj) {
      //       var wordArray = tokenizing(sentencObj.sentence, lang);
      //       _.each(wordArray, function (wordForm) {
      //          var stem = replaceDiacritic(wordForm, lang);
      //          if (stemDict[stem]) {
      //             stemDict[stem].push(wordForm);
      //          }
      //       });
      //    });

      //    var stemForms = _.values(stemDict);
      //    stemForms = Array.prototype.concat.apply([], stemForms);

      //    stems = stemForms.length !== 0 ? stemForms : stems;
      //    return stems;
      // };

      /**
       * @param  {Array} words
       * @param  {Array} cleanWord
       * @param  {string} lang
       * @return {Array} wordsWithDiacritic
       */
      function filteredWordsByDiacritic(words, cleanWord, lang) {
         return _.filter(words, function(word) {
            return cleanWord === replaceDiacritic(word, lang);
         });
      }

    /**
     * @param  {Array} sentencesArr
     * @param  {Array} stems
     * @param  {string} lang
     * @return {Array} filtredStems
     */
      function filterStemsBySentences(sentencesArr, stems, lang) {
         var stemReArr = _.map(stems, function(stem, index) {
            return searchUtils.getQuoteRe(stem, lang, 'i');
         });
         var filtredStems = _.filter(stems, function(stem, index) {
            var stemRe = stemReArr[index];
            var stemInsentences = _.some(sentencesArr, function(sentencObj, index) {
               return stemRe.test(sentencObj.sentence);
            });

            return stemInsentences;
         });
         return filtredStems;
      }

      /**
       * @param  {Array} positiveSearchArray
       * @param  {Array} blackListArray
       * @return {Array} intersectionsArray
       */
      function filterSearchArrayByBlackList(positiveSearchArray, blackListArray) {
         var intersectionsArray = [],
             blackListDict = {},
             tempObj = {};

         if (blackListArray.length !== 0) {
            _.each(blackListArray, function (item) {
               blackListDict[item] = null;
            });
            _.each(positiveSearchArray, function (book) {
               if(!blackListDict.hasOwnProperty(book) && !tempObj.hasOwnProperty(book)){
                  tempObj[book] = null;
               }
            });
            intersectionsArray = Object.keys(tempObj);
         }
         else{
            intersectionsArray = utils.uniqueElements(positiveSearchArray);
         }
         return intersectionsArray;
      }

      /**
       * @param  {Array} allSearchSentenceRes
       * @param  {Array} intersectionSentenceIndex
       * @return {Array} filtredSearchSentenceRes
       */
      function filtredIntersection(allSearchSentenceRes, intersectionSentenceIndex) {
         var filtredSearchSentenceRes = _.map(allSearchSentenceRes, function(sentenceGroupedByBook) {
            var filtredSentences = _.filter(sentenceGroupedByBook, function(sentenceIndex) {
               return intersectionSentenceIndex.indexOf(sentenceIndex) !== -1;
            });
            return filtredSentences;
         });
         return filtredSearchSentenceRes;
      }
      /**
       * @param  {Array} intersectionsArray
       * @return {Array} sentenceObjArray
       */
      function _getSentenceIds(intersectionsArray) {
         var sentenceObjArray = _.map(intersectionsArray, function (item) {
            return {
               bookId : item.split('_')[0]
            };
         });
         return sentenceObjArray;
      }

      /**
       * @param  {Array} nestedArray
       * @return {Array} flattenArray
       */
      function flatten(nestedArray){
         return Array.prototype.concat.apply([],nestedArray);
      }

      /*
        text processing function
       */
      function tokenizing(sentence, lang) {
         var ignoreQuotes = '\u0027\u00ab\u00bb\u2018\u2019\u201a\u201b\u201e\u201f\u2039\u203a\u300c\u300d\u300e\u300f\u301d\u301e\u301f\ufE41\ufE42\ufE43\ufE44\uff02\uff07\uff62\uff63';
         if (lang === 'en') {
            var tokenizeEnRe = new XRegExp('[^\\p{Latin}-' + ignoreQuotes + ']+', 'g');
            var deshEnRe = new XRegExp('((^| )-)', 'g');
            sentence = sentence.replace(tokenizeEnRe, ' ').replace(deshEnRe, ' ');
            sentence = sentence.toLowerCase().replace(/\s{2,}/, ' ').split(/\s+/);
         }
         else if (lang === 'fa') {
            sentence = farsistemmer.tokenizer(sentence);
         }
         else if (lang === 'ar' || lang === 'fa') {
            sentence = arabicstemmer.tokenizer(sentence);
         }

         sentence = _.without(sentence, '');
         return sentence;
      }

      function removeStopWord(sentence, lang) {
         var res, stopWords = [];
         if (lang === 'en') {
            stopWords = _.difference(natural.stopwords, ['said']);
         }
         else if (lang === 'fa') {
            stopWords = farsistemmer.getSimpleListStopWords();
         }
         else if (lang === 'ar') {
            stopWords = arabicstemmer.getSimpleListStopWords();
         }
         res = _.difference(_.uniq(_.compact(sentence)), stopWords);
         return res;
      }

      function getPhoneme(word, lang) {
         var phoneme;
         if (lang === 'en') {
            phoneme = searchUtils.soundExEn(word);
         }
         else if (lang === 'fa') {
            phoneme = searchUtils.soundExAr(word);
         }
         else if (lang === 'ar') {
            phoneme = searchUtils.soundExAr(word);
         }

         return phoneme;
      }

      function stemmer(token, lang) {
         var stem;
         if (lang === 'en') {
            stem = natural.PorterStemmer.stem(token);
         }
         else if (lang === 'fa') {
            stem = farsistemmer.stemmer(token);
         }
         else if (lang === 'ar') {
            stem = arabicstemmer.stemmer(token);
         }
         return stem;
      }

      function replaceDiacritic(sentence, lang) {
         var ignoreQuotes = '\u0027\u00ab\u00bb\u2018\u2019\u201a\u201b\u201e\u201f\u2039\u203a\u300c\u300d\u300e\u300f\u301d\u301e\u301f\ufE41\ufE42\ufE43\ufE44\uff02\uff07\uff62\uff63';
         var quotesRe = new XRegExp('[' + ignoreQuotes + ']+', 'g');
         sentence = sentence.replace(quotesRe, '').trim();
         if (lang === 'en') {
            var symbols = sentence.split('');
            var enRe = new XRegExp('\\p{Latin}', 'i');
            symbols = _.map(symbols, function (symbol) {
               if (enRe.test(symbol)) {
                  return unidecode(symbol);
               }
               return symbol;
            });
            sentence = symbols.join('');
         }
         else if (lang === 'fa') {
            sentence = farsistemmer.replaceDiacritic(sentence);
         }
         else if (lang === 'ar') {
            sentence = arabicstemmer.replaceDiacritic(sentence);
         }
         return sentence || '';
      }

      function getStems(sentence, lang) {
         var res;
         sentence = replaceDiacritic(sentence, lang);
         sentence = tokenizing(sentence, lang);
         sentence = removeStopWord(sentence, lang);
         res = _.map(sentence, function (elem) {
            return stemmer(elem, lang);
         }).filter(function (stem) {
            return stem.length > 1;
         });
         return res;
      }

      var renderSearch = function (query, params) {
         function highlightKeyWords(sentence, wordForms, quotes) {
            function getWordFormsRegexp(wordForms, quotesArray) {
               var boundaryCharacter = '[\'\\s\u2011-\u206F.,:;!?"(){}[\\]\\\\/|<>@#$%^&*=]';
               var nonBoundaryCharacter = boundaryCharacter[0] + '^' + boundaryCharacter.slice(1);
               var wordFormsAlternation = '',
                  quotes = '',
                  searchWordFroms = '';
               if (quotesArray.length !== 0) {
                  quotes = _.map(quotesArray, function (quote) {
                     quote = quote.join('(' + nonBoundaryCharacter + '+|' + boundaryCharacter + '+)');
                     return quote;
                  }).join('|');
                  searchWordFroms += quotes;
               }
               if (wordForms.length !== 0) {
                  wordFormsAlternation = _.map(wordForms, function (wordForm) {
                     return _str.escapeRegExp(wordForm);
                  }).join('|');
                  searchWordFroms += quotesArray.length !== 0 ? '|' + wordFormsAlternation : wordFormsAlternation;
               }

               return new RegExp(
                  '(?:^|' + nonBoundaryCharacter + '-|' + boundaryCharacter + ')' +
                  '(' + searchWordFroms + ')' +
                  '(?=$|-' + nonBoundaryCharacter + '|' + boundaryCharacter + ')', 'igm');
            }

            function highlightFunction(token) {
               return '<strong>' + token + '</strong>';
            }

            var wordFormsCapturingRegex = getWordFormsRegexp(wordForms, quotes);
            var highlightedSentence = sentence.replace(wordFormsCapturingRegex, function (match, p1) {
               return match === p1 ? highlightFunction(p1) : match.substr(0, match.length - p1.length) + highlightFunction(p1);
            });
            return highlightedSentence;
         }

         if (null === handlebarsTemplate) {
            handlebarsTemplate = fs.readFileSync(__dirname + '/searchResults.tpl');
            if (!handlebarsTemplate) {
               throw new Error('No template file!');
            }
            handlebarsTemplate = handlebars.compile(handlebarsTemplate.toString());
         }

         var deferred = q.defer();
         var templateData = {
            results : false,
            lang : {},
            params : {}
         };

         if (!params.page) {
            params.page = 0;
         }
         else {
            params.page = +params.page;
         }
         if(!params.clientID){
            params.clientID = 'ool';
         }
         params.bookId = '';
         templateData.lang[params.lang || 'en'] = true;
         var resultsPerPage = 10;
         var offset = resultsPerPage * params.page;
         templateData.params.page = params.page;
         templateData.params.lang = params.lang;
         templateData.params.clientID = params.clientID;
         templateData.params.q = query;
         templateData.somethingFound = true;

         if (params.page) {
            templateData.prevPage = {
               page : params.page - 1,
               params : templateData.params
            };
         }

         var procFunc = function () {
            //console.log(templateData)
            if (templateData.results.length) {
               templateData.nextPage = {
                  page : params.page + 1,
                  params : templateData.params
               };

            }
            templateData.hideResults = !templateData.results.length;
            if (!templateData.results.length && /^\s*\S/.test(query)) {
               templateData.somethingFound = false;
            }
            deferred.resolve(handlebarsTemplate(templateData));
         };
         search(query, params).then(function (data) {
            if (data.rows) {
               var res = 0,
                  pubI = 0,
                  pubs = [],
                  initialOffset = 0,
                  path = '';
               var promises = [];
               var addDataToResult = function (book) {
                  var pars = _.clone(params);
                  pars.bookId = book.bookId;
                  promises.push(search(query, pars));
               };
               while (pubI < data.rows.length) {
                  if (res <= offset && res + data.rows[pubI].totalResults > offset) {
                     if (res !== offset) {
                        initialOffset = offset - res;
                     }
                  }
                  else if (res > offset + resultsPerPage) {
                     break;
                  }
                  if (offset < res + data.rows[pubI].totalResults) {
                     if (data.rows[pubI].originalPath) {
                        for (var key in data.rows[pubI].originalPath) {
                           if (_.has(data.rows[pubI].originalPath, key)) {
                              path = data.rows[pubI].originalPath[key];
                              data.rows[pubI].originalPath[key] = {
                                 path : 'https://irls.isd.dp.ua/oceanoflights' + path
                              };
                           }
                        }
                     }
                     pubs.push(data.rows[pubI]);
                     addDataToResult(data.rows[pubI]);
                  }
                  res += data.rows[pubI].totalResults;
                  pubI++;
               }

               templateData.results = [];
               return q.all(promises).then(function (sents) {

                  for (var j = 0; j < sents.length; j++) {
                     if (sents[j].rows) {
                        for (var sentence = (j === 0 && initialOffset) ? initialOffset : 0; sentence < sents[j].rows.length; sentence++) {
                           var somedata = _.clone(pubs[j]);
                           somedata.sentence = highlightKeyWords(sents[j].rows[sentence].sentence, sents[j].stems, sents[j].quotes);
                           somedata.sentenceNumber = sents[j].rows[sentence].sentenceNumber;
                           templateData.results.push(somedata);
                           if (templateData.results.length === resultsPerPage) {
                              break;
                           }
                        }
                     }
                  }

               });
            }
            else {
               throw "Not found";
            }
         }).then(procFunc, procFunc);

         return deferred.promise;
      };

      /*function buildBooksBySentences(inters) {
       if (!inters.length) {
       return [
       [], []
       ];
       }
       var books = {}, sentences = [],
       key0 = inters[0].split('_')[0],
       i;
       for (i = 0; i < inters.length; i++) {
       var key = inters[i].split('_')[0];
       books[key] = (!books[key]) ? 1 : (books[key] + 1);

       if (key === key0) {
       sentences.push(inters[i]);
       }
       }
       var result = [];
       for (i in books) {
       if (books.hasOwnProperty(i)) {
       result.push({
       bookId : i,
       total_rows : books[i]
       });
       }
       }
       return [result, sentences];
       }*/

      return {
         search : search,
         getMoreText: getMoreText,
         render : renderSearch
      };
   };
})();