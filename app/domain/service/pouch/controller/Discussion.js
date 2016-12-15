define([
    '../dao/Discussion'
], function(Discussion) {
    "use strict";

    return {
        GET:{
            searchClassDiscussions: searchDiscussions,
            getClassDiscussion: getClassDiscussion
        },
        POST:{
            updateUserDiscussionMessagesState : updateMessagesState,
            persistDiscussionMessage: persistMessage,
            persistClassDiscussion: persistDiscussion
        },
        DELETE:{
            removeClassDiscussion: removeClassDiscussion
        }
    };

    function getClassDiscussion(req) {

        return Discussion.getDiscussions([req])
            .then(function(res) {
                if (res && res.length) {
                    return res[0];
                }
                return res;
            });
    }

    //TODO not implemented properly - disabled in app server
    function removeClassDiscussion(req) {
        return getClassDiscussion(req.classDiscussionId)
            //.then(function(res) {
            //    console.log(res);
            //    //remove discussion + messages?
            //})
            .then(function() {
                return req.classDiscussionId;
            });
    }

    function persistDiscussion(discussion) {
        return Discussion.persistDiscussion(discussion);
    }

    function persistMessage(msg) {
        return Discussion.persistMessage(msg);
    }

    function updateMessagesState(req) {
        return Discussion.updateMessagesState(req.classDiscussions, req.informed, req.reviewed);
    }

    function searchDiscussions(req) {
        return Discussion.searchByClass(req.classId, req.bookId);
    }

});