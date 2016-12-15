(function () {
   'use strict';

   module.exports = {
      init : function () {
         return require(__dirname + '/common.js')('mypublications', function (doc) {
            delete(doc._id);
            doc.type = 'mypublications';
         });
      }
   }
})();