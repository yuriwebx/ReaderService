(function () {
   'use strict';

   module.exports = {
      process: function(doc) {
         if (doc.studyClassType === 'studyclass') {
            doc.studyClassType = 'StudyClass';
            return doc;
         }
      }
   };
})();