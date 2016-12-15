define([
   'ngModule',
   'underscore.string'
],
function(ngModule, _s) {
   "use strict";

   return ngModule.filter('QuoteFilter', [function() {
      return function(quote) {
         var maxQuoteLen = 100;

         if (quote) {
            if (quote.length > maxQuoteLen) {
              quote = _s.prune(quote, maxQuoteLen, "...").trim(); 
            }
            quote = '“' + quote + '”';
         }

         return quote;
      };
   }]);
});