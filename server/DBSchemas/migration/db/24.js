(function () {
   'use strict';

   module.exports = {
      process: function(doc) {
         if ( doc.type === 'UserProfile' ) {
            if ( typeof doc.active === 'boolean' ) {
               doc.active = 'Approved';
            }
         }
         return doc;
      }
   };
})();