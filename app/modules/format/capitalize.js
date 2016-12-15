define([
   'ngModule'
],
function(ngModule) {
   "use strict";

   return ngModule.filter('capitalize', [function() {
      return function(text) {

         if (text && text.length) {
            text = text.toLowerCase();
            text = text.substring(0, 1).toUpperCase() + text.slice(1);
         }

         return text;
      };
   }]);
});