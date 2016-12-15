/*jslint camelcase: false */
/*jslint node: true */
(function() {
   'use strict';
   var q          = require('q');
   var _          = require('underscore');
   
   var applicationSession = require('../rest/bl/applicationSessions');
   var userPublications   = require('../rest/userpublications.js');

   function getUserPublications(runId) {
      var deferred = q.defer();
      var ids = [];
      applicationSession.getUserId(runId)
      .then(function(userId){
         return userPublications.getRecentBooks(userId);
      })
      .then(function(recentBooks){
         ids = _.map(recentBooks.books, function(book){
            return book._id;
         });
         deferred.resolve(ids);
      })
      .fail(function(){
         deferred.resolve(ids);
      });
      return deferred.promise;
   }

   function _sortByRecentBook(recentBookIDs, searchResults) {
      var prevElements = [];
      recentBookIDs.forEach(function(id) {
         searchResults = searchResults.filter(function(el) {
            if (el._id === id) {
               prevElements.push(el);
            }
            return el._id !== id;
         });
      });
      return prevElements.concat(searchResults);
   }

   var _sortByProperty = function(sortedResult, property) {
     sortedResult = _.sortBy(sortedResult, function(book){
       return book[property];
     }).reverse();
     return sortedResult;
   };

   var _sortByGrupedDocumentScore = function(sortedResult, groupName){
      var groups = _.groupBy(sortedResult, groupName);
      groups = _.map(groups, function(group){
         return _.sortBy(group, function(item) {
            return item.totalResults;
         }).reverse();
      });
      sortedResult = Array.prototype.concat.apply([],groups);
      return sortedResult;
   };

   function sortBook(searchResults, runId, testFunc) {
      var deferred = q.defer();
      getUserPublications(runId)
      .then(function(recentBookIDs) {
         var sortedResult = [],
             firstBook = [],
             priority = [];

         var booksWithPriority    = [],
             booksWithoutPriority = [];

         if (recentBookIDs.length > 0) {
            sortedResult = _sortByRecentBook(recentBookIDs, searchResults);
         }
         else if(testFunc){

            _.each(searchResults, function(el){
               if(testFunc(el)){
                  firstBook.push(el);
               }
               else {
                  sortedResult.push(el);
               }
            });
         }
         else {
            sortedResult = searchResults;
         }

         if(sortedResult[0] && sortedResult[0]._id === recentBookIDs[0]){
            firstBook = sortedResult.splice(0,1);
         }

         priority =  _.uniq(_.pluck(sortedResult, 'priority'));
         if(priority.length !== 1){
            _.each(sortedResult, function(item){
               if(item.priority !== 0){
                  booksWithPriority.push(item);
               }
               else{
                  booksWithoutPriority.push(item);
               }
            });
            booksWithPriority = _sortByProperty(booksWithPriority, 'priority');
            booksWithPriority = _sortByGrupedDocumentScore(booksWithPriority, 'totalResults').reverse();
         }
         else{
            booksWithoutPriority = sortedResult;
         }

         booksWithoutPriority = _sortByProperty(booksWithoutPriority, 'totalResults');
         sortedResult = booksWithPriority.concat(booksWithoutPriority);

         if(firstBook.length === 1){
            sortedResult.unshift(firstBook[0]);
         }
         deferred.resolve(sortedResult);
      }, deferred.reject);
      return deferred.promise;
   }

   function sortSentence(sentencesList){
      if(sentencesList.rows.length === 1){
         return sentencesList;
      }

      sentencesList.rows = _.sortBy(sentencesList.rows, function(sentenceData){
         var currentPara = sentenceData.sentenceNumber || 'para_0';
         var paraNum = currentPara.split('_')[1];
         return parseInt(paraNum) || 0;
      });

      return sentencesList;
   }
 
   module.exports = {
      sortBook     : sortBook,
      sortSentence : sortSentence
   };
}());