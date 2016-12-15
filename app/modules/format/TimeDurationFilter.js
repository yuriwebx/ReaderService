define([
   'ngModule',
   'moment'
],
function(ngModule, moment) {
   "use strict";

   return ngModule.filter('TimeDurationFilter', [function() {
      return function(timeInMs) {
         var hours = 0,
             minutes = 0;

         if (timeInMs) {
            timeInMs = parseInt(timeInMs, 10);
            hours = parseInt(moment.duration(timeInMs).asHours(), 10);
            minutes = moment.duration(timeInMs).minutes();
         }

         return hours + ":" + (minutes -  minutes % 10) / 10 + minutes % 10;
      };
   }]);
});