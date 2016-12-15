define([
   'ngModule',
   'moment'
],
function(ngModule, moment) {
   "use strict";

   return ngModule.filter('TimeFilter', [function() {
      return function(date) {

         return moment(date).calendar();
         
      };
   }]);
});