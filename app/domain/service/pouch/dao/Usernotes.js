define([
    './DB'
], function(DB) {
    "use strict";

    return {
      get : get,
      set : set,
      getDoc : _getDoc
    };

    ////////////////////////////

    /**
     *
     */
    function get(publicationId, courseId){
      return _getDoc(publicationId, courseId)
        .then(function(doc){
            doc.notes.forEach(function(note) {
                note.category = note.tag;
                note.studyGuide = false;
            });
          return doc.notes;
        });
    }


    /**
     *
     */
    function _getDoc(publicationId, courseId){
      var docId = getDocId(publicationId, courseId);
      return DB.userRW().get(docId)
        .catch(function(){
          return _getEmptyRecord(publicationId, courseId);
        });
    }

    function getDocId(publicationId, courseId) {
        return DB.id.usernotes(publicationId + '-' + (courseId || 'userdefault'));
    }

    /**
     *
     */
    function set(publicationId, courseId, annotations){
      return _getDoc(publicationId, courseId)
        .then(function(doc){
          doc.notes = JSON.parse(JSON.stringify(annotations));

          doc.notes.forEach(function(note) {
              note.tag = note.tag || note.category;
              delete note.category;
              delete note.studyGuide;
          });
          return DB.userRW().put(doc);
        });
    }


    /**
     *
     */
    function _getEmptyRecord(publicationId, courseId){
        return {
           "_id": getDocId(publicationId, courseId),
           "type": "usernotes",
           "content": {
               "title": undefined,
               "cover": undefined,
               "pubId": publicationId,
               "courseId" : courseId || false
           },
           "notes": [],
           "tags": []
        };
    }

});