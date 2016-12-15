define([
    '../dao/FlashCard',
    '../dao/Message',
    '../dao/Discussion',
    '../tools'
], function(FlashCard, Message, Discussion, tools) {
    "use strict";

    return {
        POST: {
            'usernotification': usernotification
        }
    };

    function usernotification(req) {
        var flashcards = tools.Promise.resolve();
        var messages = tools.Promise.resolve();
        var discussions = tools.Promise.resolve();
        //TODO
        var userDiscussions = tools.Promise.resolve();

        if (req.flashcards) {
            flashcards = FlashCard.getMyFlashcards();
        }
        if (req.messages) {
            messages = Message.search(req.messages);
        }
        if (req.discussions) {
            discussions = Discussion.searchByClass(req.discussions.classId, req.discussions.bookId, req.discussions.userId);
        }

        return tools.Promise.all([flashcards, messages, discussions, userDiscussions])
            .then(function(res) {
                var flashcards = res[0] || [];
                var messages = res[1] || [];
                var discussions = res[2] || [];
                var userDiscussions = res[3] || [];

                var result = [];

                if (req.flashcards) {
                    result.push({
                        name: 'flashcards',
                        data: flashcards
                    });
                }
                if (req.messages) {
                    result.push({
                        name: 'messages',
                        data: messages
                    });
                }
                if (req.discussions) {
                    result.push({
                        name: 'discussions',
                        data: discussions
                    });
                }
                if (req.userDiscussions) {
                    result.push({
                        name: 'userDiscussions',
                        data: userDiscussions
                    });
                }

                return result;
            });
    }
});
