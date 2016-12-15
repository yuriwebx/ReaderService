(function () {
   'use strict';

   module.exports = {
      process : function (doc) {
         if (doc.type === 'userstudystatistics' || doc.type === 'userpublications') {
            return 'delete';
         }
      }
   }
})();