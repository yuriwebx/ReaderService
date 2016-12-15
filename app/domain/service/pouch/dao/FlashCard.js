define([
    './DB',
    '../tools'
], function(DB, tools) {
    "use strict";

    return {
        getAll: getAll,
        getQuestionByIds: getQuestionByIds,
        getMyFlashcards: getMyFlashcards,
        addStudies: addStudies,
        updateStudy: updateStudy,
        getStudyById: getStudyById
    };

    function getMyFlashcards() {
        return getAll()
            .then(function(values){
                var curDate = new Date();

                return values
                    .filter(function (card){
                        return card.nextRunAt < curDate;
                    })
                    .map(function(card) {
                        return card._id;
                    });
            });
    }

    function getFlashCards() {
        return DB.userRW().get('flashcards')
            .catch(_getEmptyDoc);
    }

    function getAll() {
        return getFlashCards()
            .then(function(doc) {
                return doc.values;
            });
    }

    function _getEmptyDoc() {
        return {
            _id: 'flashcards',
            type: 'flashcards',
            values: []
        };
    }

    function getQuestionByIds(ids) {
        return DB.query().byIds(ids.map(DB.id.question))
            .then(function(res) {
                return res.map(function(q) {
                    q._id = q.id;

                    return q;
                });
            });
    }

    function addStudies(cards) {
        return getFlashCards()
            .then(function(res) {
                cards.forEach(function(card) {
                    card._id = card._id || tools.guid();
                    res.values.push(card);
                });
                return DB.userRW().put(res);
            });
    }

    function updateStudy(card) {
        return getAll()
            .then(function(values) {
                var study = values.filter(function(v) {
                    return v._id === card._id;
                })[0];

                var idx = values.indexOf(study);
                values[idx] = card;

                return getFlashCards()
                    .then(function(res) {
                        res.values = values;

                        return DB.userRW().put(res);
                    });
            });
    }

    function getStudyById(id) {
        return getAll()
            .then(function(values) {
                return values.filter(function(v) {
                    return v._id === id;
                })[0];
            });
    }


});
