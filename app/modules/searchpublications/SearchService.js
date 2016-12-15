define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {

         var searchResults = 0;
         var _inprocess = false;

         this.getSearchResultsLength = function(){
            return searchResults;
         };

         this.setSearchResultsLength = function(_searchResults){
            searchResults = _searchResults;
         };

         this.inprocess = function(_in) {
            _inprocess = _in;
         };

         this.isInprocess = function() {
            return _inprocess;
         };
      }]
   });
});