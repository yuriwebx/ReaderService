(function () {
   'use strict';

   var publicationTypes = ['collection', 'book', 'supplemental', 'dictionary', 'vocabulary']; 

   module.exports = {
      process: function(doc) {
         if (doc.type[0] === doc.type[0].toLowerCase() && publicationTypes.indexOf(doc.type) !== -1) {
            doc.type = doc.type.substr(0, 1).toUpperCase() + doc.type.substr(1);
            return doc;
         }
      }
   };
})();