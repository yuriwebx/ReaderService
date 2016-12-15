(function () {
   'use strict';
   module.exports = {
      process : function (document) {
         if (document.type === 'study guide') {
            return 'delete';
         }
      }
   }
})();