(function () {
   'use strict';
   
   module.exports = {
      process : function (doc) {
         var invalidCategory1 = 'religion';
         var invalidCategory2 = 'Canonical Literature';
         if (doc.type === 'study course' && (doc.category === invalidCategory1 || doc.category === invalidCategory2)) {
            return 'delete';
         }
      }
   }
})();