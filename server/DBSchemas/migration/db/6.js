(function () {
   'use strict';

   module.exports = {
      init : function () {
         var def = require('q').defer();
         var proc = require(__dirname + '/common.js');
         proc('flashcardstudy')
            .then(proc('tests', function (doc) {
               doc.type = 'tests';
            }))
            .then(proc('testquestions', function (doc) {
               doc.type = 'testquestions';
            }))
            .then(def.resolve,def.reject);
         return def.promise;
      }
   }
})();