/*jshint unused: vars*/
/*jslint node: true */
(function () {
   'use strict';

   var fs = require('fs');
   var _ = require('underscore');
   var async = require('async');
   var q = require('q');

   var searchUtils = require(__dirname + '/searchUtils');
   var utils = require('../utils/utils.js');
   var config = require('../utils/configReader.js');

   var provider = function (source) {
      var libraryDir = source;
      var globalWordIndex = {};

      var wordIndex = [];
      var bookIndex = [];
      var wordFormsCache = {};

      function readByRanges(searchObj, callback) {
         var buf = new Buffer(searchObj.len);
         fs.read(searchObj.fd, buf, 0, searchObj.len, searchObj.start, function (err, bytesRead, buffer) {
            var data = {};
            if (!err) {
               data = buffer.toString('utf8');
            }
            callback(err, data);
         });
      }

      function createSearchObject(start, len, fd) {
         return {
            start : start,
            len : len,
            fd : fd
         };
      }

      function createSearchObjects(fileDescriptor, rangesArray) {
         var searchObjects = _.map(rangesArray, function (item) {
            return createSearchObject(parseInt(item[0], 10), parseInt(item[1], 10), fileDescriptor);
         });
         return searchObjects;
      }

      function binaryReadObjectsByRanges(filename, rangesArray) {
         var defer = q.defer();
         var result = [];
         if (rangesArray && rangesArray.length === 0) {
            defer.resolve(result);
            return defer.promise;
         }
         var fd = fs.openSync(filename, 'r');
         var searchObjs = createSearchObjects(fd, rangesArray);

         async.map(searchObjs, readByRanges, function (err, results) {
            fs.close(fd);
            if (err) {
               defer.reject(utils.addSeverityResponse(err, config.businessFunctionStatus.error));
            }
            else {
               results = _.map(results, JSON.parse);
               defer.resolve(results);
            }
         });
         return defer.promise;
      }

      function updateWordFormsCache(lang, word, wordForm) {
         var caheWord = lang + '_' + word;
         if (!wordFormsCache.hasOwnProperty(caheWord)) {
            wordFormsCache[caheWord] = {};
         }
         _.each(wordForm, function(form) {
            wordFormsCache[caheWord][form] = null;
         });
      }

  
      var dataSource = {
         initGlobalWordIndex : function(){
            var filePrefixs = ['phoneme', 'stem'];
            _.each(filePrefixs, function(filePrefix){
               var pathToWordIndex = libraryDir + 'wordindex_' + filePrefix + '.json';
               if (!globalWordIndex[filePrefix]) {
                  globalWordIndex[filePrefix] = JSON.parse(fs.readFileSync(pathToWordIndex));
               }
            });
         },
         getBookIndex : function(){
            if( bookIndex.length === 0) {
               bookIndex = JSON.parse(fs.readFileSync(libraryDir + 'books_final.json'));
            }
         },
         getPathToSentencesIndex: function(filePrefix){
            return libraryDir + 'words_' + filePrefix + '.json';
         }
      };

      this.getSentencesIndex = function (searchWords, filePrefix) {
         var filtredSearchWords = [],
            notFoundWords = [],
            searchResults = [];
         var pathToWords = dataSource.getPathToSentencesIndex(filePrefix);
         dataSource.initGlobalWordIndex();

         wordIndex = globalWordIndex[filePrefix];

         _.each(searchWords, function(word){
            if (_.has(wordIndex, word)) {
               filtredSearchWords.push(wordIndex[word]);
            }
            else {
               notFoundWords.push(word.split('_')[1]);
            }
         });

         return binaryReadObjectsByRanges(pathToWords, filtredSearchWords)
            .then(function (wordObjects) {
               wordObjects.forEach(function (obj) {
                  var word = obj[filePrefix];
                  searchResults.push({
                     key : obj.lang + '_' + word,
                     value : obj.sentenceIndexes,
                     moreTextIndex : obj.moreTextIndexes
                  });
                  updateWordFormsCache(obj.lang, word, obj.forms);
               });
              return {
                  searchResults: searchResults,
                  notFoundWords: notFoundWords
               };
            });
      };

      function filterBookByMeta(doc, metaData, lang) {
         var title = doc.meta && doc.meta.title ? doc.meta.title : '';
         var author = doc.meta && doc.meta.author ? doc.meta.author : '';
         var abbreviationTitle = doc.meta && doc.meta.abbreviationTitle ? doc.meta.abbreviationTitle : '';
         var abbreviationAuthor = doc.meta && doc.meta.abbreviationAuthor ? doc.meta.abbreviationAuthor : '';
         var collectionTitle = doc.meta && doc.meta.collectionTitle ? doc.meta.collectionTitle : '';

         title = searchUtils.replaceSigns(title, lang).toLowerCase();
         author = searchUtils.replaceSigns(author, lang).toLowerCase();

         abbreviationTitle = abbreviationTitle.toLowerCase();
         abbreviationAuthor = abbreviationAuthor.toLowerCase();
         collectionTitle = collectionTitle.toLowerCase();

         var books = _.filter(metaData, function (meta) {
            meta = searchUtils.replaceSigns(meta, lang).toLowerCase();

            var isAuthor = author.length !== 0 ? author.indexOf(meta) !== -1 : false;
            var isTitle = title.length !== 0 ? title.indexOf(meta) !== -1 : false;
            var isCollectionTitle = collectionTitle.length !== 0 ? collectionTitle.indexOf(meta) !== -1 : false;

            var isTitleAbbreviation = abbreviationTitle === meta;
            var isAuthorAbbreviation = abbreviationAuthor === meta;
            return isAuthor || isTitle || isAuthorAbbreviation || isTitleAbbreviation || isCollectionTitle;
         });
         return books;
      }

      this.validateQueryMeta = function (metaData, lang) {
         if (metaData && metaData.length === 0) {
            return true;
         }
         dataSource.getBookIndex();
         var filredBooks = _.filter(bookIndex, function(doc){
            return filterBookByMeta(doc, metaData, lang).length !== 0;
         });
         return filredBooks.length !== 0;
      };

      this.getBooksByIdsAssoc = function (ids, metaData, lang) {
         var result = {};
         dataSource.getBookIndex();
         ids.forEach(function (id) {
            var books = [];
            var doc = _.findWhere(bookIndex, {
               bookId : id
            });
   
            books = filterBookByMeta(doc, metaData, lang);
            if (books.length !== 0 || metaData.length === 0) {
               result[id] = {
                  doc : doc,
                  id : id,
                  key : id
               };
               result[id].doc._id = id;
            }
         });
         return result;
      };

      this.getWordFormsByWord = function (lang, word) {
         var caheWord = lang + '_' + word;
         if(_.has(wordFormsCache,caheWord)) {
            return wordFormsCache[caheWord];
         }
         return {};
      };

      this.getSentencesByIds = function (idArray, filePrefix) {
         dataSource.getBookIndex();
         idArray = _.map(idArray, searchUtils.parseSearchIndex);

         var pathToSentences = libraryDir + 'sentences_' + filePrefix + '.json';

         return binaryReadObjectsByRanges(pathToSentences, idArray)
            .then(function (sentenceObjects) {
               var res = [];
               sentenceObjects.forEach(function (sent) {
                  res.push({
                     bookId : sent.bookId,
                     fileName : _.findWhere(bookIndex, {
                        bookId : sent.bookId
                     }).files[parseInt(sent.fileIndex)],
                     sentence : sent.text,
                     sentenceNumber : sent.locator,
                     paragraphs : sent.paragraphs
                  });
               });
               return res;
            });
         
      };

      this.readSentencesObjects = readSentencesObjects;

      function readSentencesObjects(start, len) {
         var defer = q.defer();
         var pathToSentences = libraryDir + 'sentences_stem.json';

         var fd = fs.openSync(pathToSentences, 'r');
         var searchObj = createSearchObject(start, len, fd);

         readByRanges(searchObj, function(err, result) {
            fs.close(fd);
            if(err) {
               defer.reject(err);
            }
            else {
               result = JSON.parse('[' + result + ']');
               defer.resolve(result);
            }
         });
         return defer.promise;
      }

   };


   module.exports = provider;
}());