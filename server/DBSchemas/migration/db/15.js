(function () {
   'use strict';
   
   module.exports = {
      process : function (doc) {
         if (doc.type === 'study course' || doc.type === 'study guide' || doc.type === 'userpublications') {
            if (doc.userId !== '58796542ee94c118265487e8bd073776') {
               return 'delete';   
            }            
         }
      }
   }
})();