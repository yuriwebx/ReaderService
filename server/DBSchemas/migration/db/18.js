(function () {
   'use strict';

   module.exports = {
      process : function (doc) {
         if (doc.title) {
            doc.name = doc.title;
            delete doc.title;
         }
         return doc;
      }
   };
})();