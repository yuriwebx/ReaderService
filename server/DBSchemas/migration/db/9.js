(function () {
   'use strict';

   module.exports = {
      init : function () {
          return require(__dirname + '/common.js')('publication', function (doc) {
            if (!doc.type) {
               doc.type = 'book';
            }
         });
      }
   }
})();