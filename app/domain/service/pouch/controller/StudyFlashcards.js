define([
    '../dao/FlashCard',
    '../dao/Publication',
    '../tools',
    'underscore'
], function(Flashcard, Publication, tools, _) {
    "use strict";

    var runTimeSchemaInMS = [
        0,
        10 * 60 * 1000,
        60 * 60 * 1000,
        60 * 5 * 60 * 1000,
        60 * 24 * 60 * 1000,
        5 * 24 * 60 * 60 * 1000,
        25 * 24 * 60 * 60 * 1000
    ];

    return {
        GET: {
            searchStudies: search,
            all: getFlashcards,
            searchAssignedFlashcards: searchAssignedFlashcards
        },
        POST: {
            activate: activate,
            initiate: initiate,
            update: update,
            add: add
        }
    };

    function searchAssignedFlashcards(req) {
        return getFlashcards()
            .then(function(studies) {
                var ids = studies.map(function(fl) {
                    return fl._id;
                });

                return initiate({flashcardStudyIds: ids})
                    .then(function(res) {
                        var questionStudies = res.questions.map(function(q) {
                            var study = studies.filter(function(st) {
                                return st._id === q.id;
                            })[0];
                            study.question = q.question;
                            study.answer = q.answer;

                            return study;
                        });
                        res.terms.forEach(function(t) {
                            t.question = t.termName;
                        });

                        return tools.Promise.resolve({
                            questions: questionStudies.filter(filterCards(req)),
                            terms: res.terms.filter(filterCards(req))
                        });
                    });
            });
    }

    function filterCards(req) {
        var isFilter = req.filter && req.filter.length,
            isCorrectAnswersCount = req.correctAnswersCount && req.correctAnswersCount.length;

        if (isFilter || isCorrectAnswersCount) {
            var _filter = req.filter || null,
                regExp = new RegExp(_filter, 'gi'),
                _correctAnswersCount = parseInt(req.correctAnswersCount, 10);
            _correctAnswersCount = isNaN(_correctAnswersCount) ?  null : _correctAnswersCount;

            return function (item) {
                return (regExp.test(item.question) &&
                    (item.correctAnswersCount === _correctAnswersCount || !isCorrectAnswersCount)) ||
                    (item.correctAnswersCount === _correctAnswersCount && !isFilter);
            };
        }

        return function() {
            return true;
        };
    }

    function getFlashcards() {
        return Flashcard.getAll();
    }

    function search() {
        return Flashcard.getMyFlashcards();
    }

    function activate(req) {
        return Publication.getById(req.publicationId)
            .then(function(pub) {
                var test = pub.test.filter(function(quiz) {
                    return quiz._id === req.testId;
                })[0];

                if (test) {
                    var cards = test.questions.map(function(id) {
                        var now = Date.now();
                        return {
                            _id: id,
                            mastered: false,
                            correctAnswersCount: 0,
                            createdAt: now,
                            nextRunAt: now,
                            testId: test._id
                        };
                    });

                    return Flashcard.addStudies(cards)
                        .then(function() {
                            return test.questions.map(function(id) {
                                return id;
                            });
                        });
                }
                else {
                    return tools.Promise.reject();
                }
            });
    }

    function initiate(req) {
        return tools.Promise.all([
                Flashcard.getQuestionByIds(req.flashcardStudyIds),
                Flashcard.getAll()
            ])
            .then(function(res) {
                var questions = res[0];
                var studies = res[1];
                var questionIds = questions.map(function(q) {
                    return q.id;
                });
                var termsIds = req.flashcardStudyIds.filter(function(id) {
                    return questionIds.indexOf(id) === -1;
                });

                var terms = termsIds.map(function(id) {
                    return studies.filter(function(st) {
                        return st._id === id;
                    })[0];
                });

                return {
                    questions: questions,
                    terms: terms
                };
            });
    }

    function add(req) {
        return Flashcard.getAll()
            .then(function(cards) {
                return cards.filter(function(card) {
                    return req.dictionaryTermName === card.termName;
                });
            })
            .then(function(cards) {
                var unique = true;
                cards.forEach(function (c) {
                    if (req.partOfSpeech === c.partOfSpeech) {
                        unique = false;
                    }
                });
                if (!unique) {
                    return tools.Promise.reject('Flashcard is already exists');
                }
                else {
                    var curDate = new Date().getTime();
                    var _flashcard = {
                        mastered: false,
                        correctAnswersCount: 0,
                        createdAt: curDate,
                        lastRunAt: undefined,
                        nextRunAt: curDate,
                        termName: req.dictionaryTermName,
                        partOfSpeech: req.partOfSpeech,
                        dictionaryId: req.dictionaryId
                    };

                    return Flashcard.addStudies([_flashcard]);
                }
            })
            .then(function() {
                return 'Ok';
            });
    }

    function update(data) {
        if (!data.flashcardStudyId) {
            return tools.Promise.resolve();
        }
        return Flashcard.getStudyById(data.flashcardStudyId)
            .then(function(flashcardStudy) {
                var curDate = Date.now();
                if (data.passed) {
                    var counter = 1 + parseInt(flashcardStudy.correctAnswersCount);
                    var deltaTime = runTimeSchemaInMS[counter];


                    if (counter === runTimeSchemaInMS.length - 1) {
                        _.extend(flashcardStudy, {
                            lastRunAt: curDate,
                            nextRunAt: 0,
                            correctAnswersCount: counter,
                            mastered : true
                        });
                    }
                    else {
                        _.extend(flashcardStudy, {
                            lastRunAt: curDate,
                            nextRunAt: curDate + deltaTime,
                            correctAnswersCount: counter
                        });
                    }
                }
                else {
                    _.extend(flashcardStudy, {
                        lastRunAt: curDate,
                        nextRunAt: curDate,
                        correctAnswersCount: 0
                    });
                }

                return Flashcard.updateStudy(flashcardStudy);
            })
            .then(function() {
                return 'Ok';
            });
    }
});