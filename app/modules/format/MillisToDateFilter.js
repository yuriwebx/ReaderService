define([
   'ngModule',
   'moment'
],
function(ngModule, moment) {
   "use strict";

   return ngModule.filter('MillisToDateFilter', [function() {
      return function(timeInMs) {
         var date = new Date(timeInMs);
         return moment(date).format('MMM DD, YYYY');
      };
   }]);
});