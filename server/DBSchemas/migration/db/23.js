(function () {
   'use strict';

   module.exports = {
      process: function(doc) {
         if (doc.type === 'class discussion message') {
            if (doc.registeredAt) {
               doc.createdAt = doc.registeredAt;
               delete doc.registeredAt;
            }
            doc.type = 'ClassDiscussionMessage';
         }
         if (doc.type === 'class discussion') {
            doc.type = 'ClassDiscussion';
         }
         return doc;
      }
   };
})();