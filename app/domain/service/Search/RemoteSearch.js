define([
   'module',
   'underscore',
   'SearchUtils',
   'Context',
   'swServiceFactory'
], function (module, _, searchUtils, Context, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['$q', 'swRestService', 'swOfflineModeService',
         function ($q, swRestService, swOfflineModeService) {
            var logger = this.logger;

            this.search = search;
            this.getMoreText = getMoreText;

            function isValidSearchByMeta(metaData) {
               var MIN_NUMBER_CHAR_META_DATA = 2;
               var maxLengthMetaData = _.max(metaData, _.property('length')).length || 0;
               return maxLengthMetaData >= MIN_NUMBER_CHAR_META_DATA || metaData.length === 0;
            }

            function hasEmptyMetaInQuery(query) {
               var metaDataRe = /\(\s{0,}\)/;
               var hasEmptyMeta = metaDataRe.test(query);
               return hasEmptyMeta;
            }

            function isValidQuotesLength(quotes) {
               var MIN_QUOTES_NUMBER_CHAR = 3;
               var queryLength = _.map(quotes, _.property('length'));
               return (queryLength.length !== 0 && _.min(queryLength) >= MIN_QUOTES_NUMBER_CHAR) || quotes.length === 0;
            }

            function isValidStandAloneWords(standAloneWords) {
               var MIN_NUMBER_CHAR = 3;
               return standAloneWords.length !== 0 && standAloneWords.join('').length >= MIN_NUMBER_CHAR;
            }

            var currentRequest;
            function search(data) {
               var deferred = $q.defer();
               if (currentRequest && currentRequest.abort) {
                  currentRequest.abort();
                  currentRequest = null;
               }

               var query = searchUtils.parseQuery(data.q,  Context.parameters.searchConfig, data.lang);

               if (hasEmptyMetaInQuery(data.q)) {
                  deferred.resolve({rows : [], stems : [], isValidSearchQuery: false});
               }

               if (!isValidSearchByMeta(query.metaData)) {
                  deferred.resolve({rows : [], stems : [], isValidSearchQuery: false});
               }
               
               if (!isValidStandAloneWords(query.standAloneWords) && !isValidQuotesLength(query.quotes)) {
                  deferred.resolve({rows : [], stems : [], isValidSearchQuery: true});
               }

               if (!isValidQuotesLength(query.quotes)) {
                  deferred.resolve({rows : [], stems : [], isValidSearchQuery: true});
               }

               data.bookId = data.bookId || '';
               (currentRequest = swRestService.call('post', 'Search', '', data))
               .then(function (result) {
                  var res = _.get(result, 'data.rows', null);
                  if (res === null) {
                     logger.debug('bad request response ' + JSON.stringify(result) + ', lang: ' +  data.lang + ', query: '  + data.q);
                     deferred.resolve({rows : [], stems : [], isValidSearchQuery: true});
                     return;
                  }

                  result.data.rows.forEach(function (item) {
                     item.remote = true;
                  });
                  result.data.isValidSearchQuery = true;
                  deferred.resolve(result.data);
               })
               .fail(function(reason){
                  if (_.has(reason, 'data') && reason.data === 'abort') {
                     logger.debug('request was aborted lang: ' +  data.lang + ', query: '  + data.q);
                  }
                  else {
                     logger.debug('request was fali lang: ' +  data.lang + ', query: '  + data.q + ', reason: ' + JSON.stringify(reason));
                  }
                  if (swOfflineModeService.isOffline()) {
                     deferred.resolve({rows : [], stems : [], isValidSearchQuery: true});
                  }
                  else {
                     if (reason && reason.status !== 0) {
                        deferred.reject(reason);
                     }

                  }
               })
               .always(function(){
                  currentRequest = null;
               });
               
               return deferred.promise;
            }

            function getMoreText(start, len, clientID) {
               var data = {
                  start: start,
                  len: len,
                  clientID: clientID
               };
               return swRestService.call('get', 'Search', 'moretext', data);
            }
         }]
   });
});