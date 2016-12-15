define([
    './Usernotes',
    './DB'
], function(Usernotes, DB) {
    "use strict";

    return {
      get : get,
      set : set
    };

    ////////////////////////////

    /**
     *
     */
    function get(publicationId, courseId){
      return _getDoc(publicationId, courseId);
    }


    /**
     *
     */
    function _getDoc(publicationId, courseId){
      return Usernotes.getDoc(publicationId, courseId)
        .then(function(res) {
            return res.tags || [];
        });
    }

    /**
     *
     */
    function set(publicationId, courseId, tags){
      return _getDoc(publicationId, courseId)
        .then(function(res){
            res = tags.map(function(tag){
              delete tag.$$hashKey;
              return tag;
          });
          return Usernotes.getDoc(publicationId, courseId)
              .then(function(doc) {
                  doc.tags = res;

                  return DB.userRW().put(doc);
              });
        });
    }

});