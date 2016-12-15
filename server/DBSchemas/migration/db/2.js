(function () {
   'use strict';

   module.exports = {
      init : function () {
         return require(__dirname + '/common.js')('referencedata', function (doc) {
            doc.userId = doc._id;
            delete(doc._id);
            doc.type = 'referencedata';
         });
      }
   }
})();