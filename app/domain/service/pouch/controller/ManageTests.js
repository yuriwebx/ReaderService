define([
    '../dao/Publication',
    '../dao/FlashCard'
], function(Publication, FlashCard) {
    "use strict";

    return {
        GET:{
            'getTest' : getTest
        }
    };

    function getTest(req) {
        return Publication.getById(req.publicationId)
            .then(function(pub) {
                var test = pub.test.filter(function(t) {
                    return t._id === req.id;
                })[0];

                test.testQuestions = test.questions;

                return FlashCard.getQuestionByIds(test.questions)
                    .then(function(res) {
                        test.testQuestions = res;

                        return test;
                    });
            });
    }

});