(function () {
   'use strict';

   module.exports = {
      init : function () {
         var def = require('q').defer();
         var proc = require(__dirname + '/common.js');
         proc('applicationsessions', function (doc) {
            doc.type = 'applicationsessions';
         }).then(proc('sessions', function (doc) {
            doc.type = 'sessions';
            if(doc.userID){
               doc.userId = doc.userID;
               delete doc.userID;
            }
         })).then(def.resolve,def.reject);
         return def.promise;
      }
   }
})();
