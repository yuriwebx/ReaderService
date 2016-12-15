(function () {
   'use strict';

   module.exports = {
      init : function () {
         var def = require('q').defer();
         var proc = require(__dirname + '/common.js');
         proc('users', function (doc) {
               doc.type = 'UserProfile';
            })
            .then(proc('emailauthenticationtask', function (doc) {
               doc.type = 'emailtask';
            }))
            .then(def.resolve,def.reject);
         return def.promise;
      }
   }
})();