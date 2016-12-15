(function () {
   'use strict';

   module.exports = {
      init : function () {
         var def = require('q').defer();
         var proc = require(__dirname + '/common.js');
         proc('userpublications', function (doc) {
            doc.type = 'userpublications';
         })
            .then(proc('materials', function (doc) {
               doc.type = 'materials';
            }))
            .then(def.resolve,def.reject);
         return def.promise;
      }
   }
})();