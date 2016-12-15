/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
  'use strict';
  var _ = require('underscore');
  var config = require(__dirname + '/../utils/configReader.js');
  var natural = require('natural');
  var mail = require('../mail/sendPasswordMailController.js');
  var util = require('util');
  var q = require('q');
  var fs = require('fs');
  var userstudystatistics = require('./userstudystatistics');
  var publication = require('./publication.js');
  var applicationSession = require('./bl/applicationSessions');

  function getVocabularyPaths(){
      var defer = q.defer();
      var language = 'en';
      var contentType = config.contentTypeEnum.vocabulary;
      var categories = ''; //['Book','StudyGuide','dictionary','Vocabulary']
      var filter = '';
      var itemsCount;
      var userId;
      var vocabularyDirNames = [];
      publication.searchPublications(userId, filter, itemsCount, language, contentType, categories).then(function(response) {
        if (response.status === config.businessFunctionStatus.ok) {
          _.each(response.data, function(element){
            var path = config.libraryDir + element.id;
            if(fs.existsSync(path)){
              vocabularyDirNames.push(path);
            }
          });
          if(vocabularyDirNames.length !== 0){
            defer.resolve({
              data: vocabularyDirNames,
              status: config.businessFunctionStatus.ok
            });
          }
          else{
            defer.resolve({
              text: 'Vocabulary path has not found',
              status: config.businessFunctionStatus.error
            });
          }
        }
        else {
          defer.resolve({
            status: config.businessFunctionStatus.error,
            text: response.text
          });
        }
      }, defer.reject);
      return defer.promise;
  }

  function saveVocabularyResults(runId, data) {
    var defer = q.defer();
    applicationSession.getUserId(runId).then(function(uid){
      return userstudystatistics.updateUserStatistics(uid, {vocabularyTermsCount : parseInt(data.vocabularyTermsCount, 10) || 0});
    }).then(defer.resolve).fail(defer.reject);
    return defer.promise;
  }

  function getResultUser(uid){
    return userstudystatistics.getUserStatisticsByUid(uid);
  }

  function sendEmail(profile, logVocabulary, language) {
    var defer = q.defer();
    mail.sendResultsVocabulary(profile, logVocabulary, language).then(function() {
      defer.resolve({
        status: config.businessFunctionStatus.ok
      });
    },  defer.reject);
    return defer.promise;
  }

  function getFreqDict(){
    var defer = q.defer();
    var freqDictFileName = 'frequencyDictionary.json',
        path,
        freqDict = {};
    getVocabularyPaths().then(function(response) {
      if (response.status === config.businessFunctionStatus.ok) {
        path = response.data[0] + '/' + freqDictFileName;
        fs.readFile(path, function(err, data) {
          if (!err) {
            freqDict = JSON.parse(data);
            defer.resolve({
              data: freqDict,
              status: config.businessFunctionStatus.ok
            });
          }
          else {
            defer.reject({
              text: err,
              status: config.businessFunctionStatus.error
            });
          }
        });
      }
      else {
        defer.reject(response);
      }
    }, defer.reject);
    return defer.promise;
  }
  // var text1 = "Unlike when writing buffer, the entire string must be written. No substring may be specified. 
  //This is because the byte offset of the resulting data may not be the same as the string offset.";
  // //{ data: 20, status: 'OK' }
  // var text2 = "Unlike";
  // //{ data: 4, status: 'OK' }
  // var text3 = "xcvxcvxcvxcv dfsdfsdfs adasdas";
  // // { text: 'Words "xcvxcvxcvxcv,dfsdfsdfs,adasdas" has not found in frequency dictionary.', status: 'ERROR' }
  //   calculateTextDifficulty(text1).then(function(response){
  //     console.log(response);
  //   }, function(reason){
  //     console.log(reason);
  //   }); 
  
  function calculateTextDifficulty(sentence){
    var defer = q.defer();
    var tokenizer = new natural.WordTokenizer(), words, sweetSpot, sentenceLevel, tokenizedWords;
    getFreqDict().then(function(wordLevel){
      if(wordLevel.status === config.businessFunctionStatus.ok){
        wordLevel = wordLevel.data;
        tokenizedWords = _.difference(_.map(_.uniq(_.compact(tokenizer.tokenize(sentence))), function(elem) {
          return elem.toLowerCase();
        }), natural.stopwords);

        words = tokenizedWords.filter(function(elem) {
          return wordLevel[elem];
        }).map(function(word) {
          return wordLevel[word];
        }).sort(function(a, b) {
          return a - b;
        });

        if(words.length !== 0){
          sweetSpot = Math.round((words.length - 1) * 0.97);
          sentenceLevel = Math.round(words[sweetSpot] / 1000);
          defer.resolve({
            data: sentenceLevel,
            status: config.businessFunctionStatus.ok
          });
        }
        else{
          defer.resolve({
            text: util.format('Words "%s" has not found in frequency dictionary.', tokenizedWords),
            status: config.businessFunctionStatus.error
          });
        }
      
      }
      else{
        defer.reject(wordLevel);
      }
    }, defer.reject);
    return defer.promise;
  }

  module.exports = {
    getVocabularyPaths: getVocabularyPaths,
    saveVocabularyResults : saveVocabularyResults,
    getResultUser : getResultUser,
    sendEmail: sendEmail,
    calculateTextDifficulty: calculateTextDifficulty
  };
