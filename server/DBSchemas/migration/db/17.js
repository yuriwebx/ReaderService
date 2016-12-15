(function () {
   'use strict';

   module.exports = {
      process : function (doc) {
         if (doc.type === 'study course') {
            delete doc.name;
         }
         return doc;
      }
   };
})();