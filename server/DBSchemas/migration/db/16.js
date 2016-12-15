(function () {
   'use strict';

   module.exports = {
      process : function (doc) {
         if (doc.coverId) {
            doc.cover = doc.coverId;
            delete doc.coverId;
         }
         return doc;
      }
   }
})();