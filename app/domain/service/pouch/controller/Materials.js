define([
    '../dao/Usernotes',
    '../dao/Tags',
    '../dao/Publication'
], function(Usernotes, Tags, Publication) {
    "use strict";

    return {
        GET:{
            'annotations' : getAnnotations,
            'categories' : getTags
        },
        POST:{
            'update': update
        }
    };

    function getPublicationId(id) {
        return Publication.getById(id)
            .then(function(publication) {
                if(publication.type === 'StudyGuide') {
                    return publication.bookId;
                }
                return publication._id;
            });
    }


    /**
     * user materials
     */
    function getAnnotations(req) {
        return getPublicationId(req.publicationId)
            .then(function(pubId){
                return Usernotes.get(pubId, req.classId);
            });
    }

    /**
     * user materials
     */
    function getTags(req) {
        return getPublicationId(req.publicationId)
            .then(function(pubId) {
                Tags.get(pubId, req.classId);
            });
    }


    /**
     * user only
     * REQUEST: {"bookId":"db5d14e1eeacc897ad5c6c955ee8b646","editor":false,"studyGuide":false,"materials":{"annotations":[...]}}
     */
    //TODO track by type (+studyGuide)
    function update(req) {
        var annotations = req.materials.annotations;
        if (annotations) {
            return Usernotes.set(req.bookId, req.classId, annotations);
        }

        var tags = req.materials.categories;
        if (tags) {
            return Tags.set(req.bookId, req.classId, tags);
        }
    }





});
