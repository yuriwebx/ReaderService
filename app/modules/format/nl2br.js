define([
      'ngModule'
   ],
   function(ngModule) {
      "use strict";
      return ngModule.filter('nl2br', [function() {
         return function(str) {
            return typeof str !== 'string' ? str : (str.replace(/\n/g,'<br>'));
         };
      }]);
   });