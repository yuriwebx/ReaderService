define([
  'module',
  'underscore',
  'swServiceFactory',
  'Config',
  './RemoteSearch',
  './SearchResultFilter'
], function(module, _, swServiceFactory) {
  'use strict';

  swServiceFactory.create({
    module: module,
    service: ['SearchResultFilter', 'swRemoteSearch', 'swSearchService',
      function(searchResultFilter, swRemoteSearch, swSearchService) {
        var logger = this.logger;

        // *
        //  * @param {string} searchText phrase to search
        //  * @param {string} lang ISO language
        //  * @param {string} [bookId] book hash to search in. If omitted, all books
        //  * will be searched
        //  * @param {integer} startFromKey start id of search result
        //  * @param {string} type - which type of search to use: local or remote. If noting is
        //  * specified, then both will be used
         
        this.search = function(params) {
          params.q = params.q || '';

          params.type = 'remote';

          if(!params.lang){
            logger.debug('    search lang defaulted to EN');
            params.lang = 'en';
          }
          logger.debug('searching for "' + params.q + '"');

          if (!params.bookId) {
            logger.debug('    in all books');
          }
          else {
            logger.debug('    in book with id "' + params.bookId + '"');
          }
          logger.debug('    in locale "' + params.lang + '"');

          return performRemoteSearch(params).then(_onSearchFilter, _onSearchError);

          function _onSearchFilter(result) {
            result.rows = result.rows.map(function(item) {
              item[params.type] = true;
              return item;
            });
            if ((result.stems && (result.stems.length > 0)) || (result.quotes && result.quotes.length !== 0) ) {
              result = searchResultFilter(result, params.lang);
            }

            if (!params.bookId && result.isValidSearchQuery) {
              swSearchService.setSearchResultsLength(result.rows.length);
            }
            return result;
          }

          function _onSearchError(reason) {
            logger.error('Error, performing search. ' + reason.message);
            return [];
          }
        };

        this.getMoreText = getMoreText;

         function getMoreText(start, len, clientID) {
            return swRemoteSearch.getMoreText(start, len, clientID);
         }

        // *
        //  * Wraps remote search, adding timeout, to reject search results if request
        //  * has pending status too long
         
        function performRemoteSearch(data) {
          return swRemoteSearch.search(data);
        }

         //tabs
         this.setRecentSearchTabItem = setRecentSearchTabItem;
         this.getRecentSearchesTabItemVeiw = getRecentSearchesTabItemVeiw;
         this.addRecentSearchesTabListener = addRecentSearchesTabListener;
         this.removeRecentSearchesTabListener = removeRecentSearchesTabListener;

         var resecentSearchesTabs = [],
             listeners = {},
             maxTabsNumber = 25;

         function removeSelf(e, item) {
            e.stopPropagation();
            var searchItem = _.findWhere(resecentSearchesTabs, {id: item.id});
            var index = resecentSearchesTabs.indexOf(searchItem);
            resecentSearchesTabs.splice(index, 1);
            onUpdateRecentSearchTabItem();
         }

         function getRecentSearchesTabItemVeiw() {
            return resecentSearchesTabs.slice(1);
         }

         function onUpdateRecentSearchTabItem() {
            var lisenersNames = _.keys(listeners);
            _.each(lisenersNames, function(lisenersName) {
               listeners[lisenersName](getRecentSearchesTabItemVeiw());
            });
         }

         function checkNumberTabs() {
            if(resecentSearchesTabs.length > maxTabsNumber){
              resecentSearchesTabs.splice(maxTabsNumber);
            }
         }

         function setRecentSearchTabItem(item) {
            item.lastSearchesAt = new Date().getTime();
            item.removeSelf = removeSelf;
            var searchItem = _.findWhere(resecentSearchesTabs, {id: item.id});
            if (!searchItem) {
              resecentSearchesTabs.unshift(item);
              checkNumberTabs();
              onUpdateRecentSearchTabItem();
            }
         }

         function addRecentSearchesTabListener(listener, name) {
            listeners[name] = listener;
         }

         function removeRecentSearchesTabListener(name) {
            delete listeners[name];
         }
      }
    ]
  });
});