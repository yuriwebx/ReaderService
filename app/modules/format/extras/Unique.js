define([
   'ngModule'
],
function(ngModule) {
   "use strict";

   return ngModule.filter('Unique', [function() {
      return function(items, field) {
         var unique = [];
         var result = [];

         items && items.forEach(function(item) {
            if (unique.indexOf(item[field]) < 0 ) {
               if (item[field]) {
                  unique.push(item[field]);
                  result.push(item);
               }
            }
         });
         return result;
      };
   }]);
});