(function () {
   'use strict';
   
   module.exports = {
      process : function (doc) {
         if (doc.type === 'study course' || doc.type === 'studycourseItem' || (doc.type === 'book' && !doc.status)) {
            return 'delete';
         }
      }
   }
})();