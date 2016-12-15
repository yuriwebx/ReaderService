define([
    'underscore',
    '../tools',
    '../dao/Publication',
    '../dao/UserStudy',
    '../dao/User',
    'text!config/default.config.json'
], function(_,  tools, Publication, UserStudy, User, config) {
    "use strict";

    var excConfig = JSON.parse(config).timeExercises;
    var Promise = tools.Promise; //FIX:

    return {
        GET:{
            search: search,
            getBookInfo : getBookInfo,
            getStudyGuideInfo: getBookInfo,
            getCollectionInfo: getCollectionInfo,
            details: getDetails
        },
        POST:{
            persistCurrentStudyGuide: persistCurrentStudyGuide,
            persistDefaultStudyGuide: persistDefaultStudyGuide
        }
    };

    function getCollectionInfo(req) {
        var colId = req.id;
        return Publication.getById(colId)
            .then(function(collection) {
                return Publication.getByIds(collection.items)
                    .then(function(items) {
                        _.extend(collection, items.reduce(function (r, item) {
                            r.booksNumber++;
                            r.wordsNumber += item.wordsNumber;
                            r.paragraphsNumber += item.paragraphsNumber;
                            r.difficulty += item.difficulty;
                            return r;
                        }, {
                            booksNumber       : 0,
                            wordsNumber       : 0,
                            paragraphsNumber  : 0,
                            difficulty        : 0
                        }));
                        collection.difficulty /= collection.booksNumber;

                        return {
                            collection: collection,
                            books: items
                        };
                    });
            });
    }

    /**
     *
     */
    function getBookInfo(req){
        var bookId = req.id;
        return Publication.getById(bookId)
            .then(function(pub) {
                var book = pub;
                var guide = {};
                if (pub.type === 'StudyGuide') {
                    guide = pub;
                    book = Publication.getById(pub.bookId);
                }
                //TODO course based on StudyGuide
                return Promise.all([
                    book, guide
                ]);
            })
            .then(function(res) {
                var pub = res[0];
                var guide = res[1];
                return Promise.all([
                    pub,
                    Publication.getRelatedStudyGuides(pub.id),
                    UserStudy.get(pub.id),
                    guide,
                    User.getByIds(Object.keys(guide.editors || {}))
                ]);
            })
            .then(function(res){
                var book = res[0];
                var relatedGuides = res[1];
                var activity = res[2];
                var guide = res[3];
                var editors = res[4];

                // workaround
                var toc =  book.tableOfContents;
                delete  book.tableOfContents;

                book.userPublication = {
                    //TODO
                    personal: activity.personal,
                    lastTouchedAt: activity.lastOpenedAt || 0,
                    readingDuration: activity.readingDuration || 0,
                    readingProgress: activity.readingProgress || 0,
                    completed: activity.completed || false
                };

                var relatedStudyGuides = relatedGuides.map(getRelatedStudyGuideInfo);

                var info = {
                    book: book,
                    currentStudyGuideId: activity.currentStudyGuideId || guide.id || "",
                    defaultStudyGuideId: book.defaultStudyGuideId || "",
                    relatedStudyGuides: relatedStudyGuides,
                    id: book.id,
                    tableOfContents: toc
                };

                if (guide.id) {
                    info.id = guide.id;
                    info.editors = editors.map(getEditorView(guide.editors));
                    info.studyGuide = relatedStudyGuides.filter(function(guide) {
                        return guide.id === activity.currentStudyGuideId;
                    })[0] || {};
                }

                return info;
            });
    }

    function getEditorView(editors) {
        return function(user) {
            return {
                user: {
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    photo: _.has(user, 'photo') ? user.photo.fileHash || user.photo : ''
                },
                editorStatus: editors[user.userId] && editors[user.userId].status
            };
        };
    }

    function calculateReadingTime(exercises) {
        var readingTime = 0;
        if (exercises) {
            readingTime += excConfig.quizQuestion * exercises.numberQuizQusetions +
                excConfig.flashcard * exercises.flashcards +
                excConfig.essay * Math.round(exercises.essaysWordLimit / 10) +
                excConfig.microJournaling * exercises.microJournaling;
        }
        return readingTime;
    }

    function getRelatedStudyGuideInfo(guide) {
        guide.readingTime = guide.readingTime + calculateReadingTime(guide.exercises);

        return guide;
    }

    /**
     *
     */
    // some data copied from server/rest/publication.js
    // TODO: might need to reconsider some logic
    function search(requestData) {
        var filter = requestData.filter;
        var itemsCount = requestData.itemsCount;
        var language = requestData.language;
        var contentType = requestData.contentType;
        var categories = requestData.categories;
        var personalPublications = requestData.personalPublications;
        var collectionId = requestData.collectionId || null;

        var opts = {};

        // logic from backend side
        var predefinedContentTypes = [
            'Dictionary',
            'StudyGuide',
            'StudyCourse',
            'StudyClass',
            'Collection'
        ];

        if (categories) { //multiply categories ?
            if (predefinedContentTypes.indexOf(categories) > -1) {
                contentType = categories;
            }
            else {
                contentType = 'Book';
            }
        }


        // get user books
        var promiseUserBooks = Publication.getMyBooks()
            .then(function(userBooks) {
                return userBooks.ids;
            })
            .catch(function() {
                return [];
            });

        var promiseCollectionBooks = Promise.resolve(null);
        if (collectionId) {
            promiseCollectionBooks = Publication.getById(collectionId)
                .then(function(doc) {
                    return doc.items;
                })
                .catch(function() {
                    return [];
                });
        }

        var myBooks;
        // get books
        return Promise.all([promiseUserBooks, promiseCollectionBooks])
            .then(function(data) {
                var userBooks = data[0];
                var collectionBooks = data[1];

                //keys (Array of keys to fetch in a single shot)
                if (collectionBooks) {
                    opts.keys = collectionBooks || [];
                }
                else if (personalPublications) {
                    opts.keys = userBooks || [];
                }
                myBooks = userBooks;
                return Publication.getByOptions(opts, userBooks);

            })
            .then(function(data) {
                if (personalPublications) {
                    var collectionIds = _.uniq(data.map(function(pub) {
                        return pub.collection;
                    }).filter(Boolean));

                    var excludeCollectionItems = data.filter(function(pub) {
                        return !pub.collection;
                    });

                    //my books -> collection
                    if (collectionId) {
                        collectionIds = [];
                        excludeCollectionItems = data.filter(function(pub) {
                            return myBooks.indexOf(pub.id) > -1;
                        });
                    }

                    return Promise.all([
                            collectionIds.length ? Publication.getByIds(collectionIds) : Promise.resolve([]),
                            excludeCollectionItems
                        ])
                        .then(function(res) {
                            return res[0].concat(res[1]);
                        });
                }
                return data;
            })

            .then(tools.filterData({
                "type": tools.toUCFirst(contentType),
                "language": language,
                "category": categories
            }))
            .then(function(data) {

                function filterByCriteria(item) {
                    var name = (item.name || '').toLowerCase();
                    var author = (item.author || '').toLowerCase();

                    return ((name && name.toLowerCase().indexOf(filter.toLowerCase()) > -1) ||
                    (author && author.toLowerCase().indexOf(filter.toLowerCase()) > -1));
                }

                function hasItemInMyBooks(ids) {
                    if (ids) {
                        for (var i in myBooks) {
                            if (myBooks.hasOwnProperty(i)) {
                                if (ids.indexOf(myBooks[i])) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                }

                if (!collectionId) {
                    var matchesMap = {};

                    data = data.filter(function(item) {
                        item.personal = myBooks.indexOf(item.id) > -1;
                        var pickFlag = !personalPublications || item.personal || (personalPublications && hasItemInMyBooks(item.items));
                        pickFlag = pickFlag && (!filter.length || filterByCriteria(item, filter));

                        if (pickFlag && item.collection) {
                            matchesMap[item.collection] = matchesMap[item.collection] || 0;
                            matchesMap[item.collection]++;
                            pickFlag = false;
                        }
                        if (!personalPublications && item.type === 'Collection') {
                            if (contentType !== 'Collection') {
                                item.matches = matchesMap[item.id];
                            }
                            pickFlag = item.matches;
                        }

                        return pickFlag;
                    });

                    data = sortPublication(data);
                }

                return data;

                //return (filter && !collectionId) ? data.filter(filterByCriteria) : data;
            })
            .then(function(res) {
                if (itemsCount) {
                    res = res.slice(0, +itemsCount);
                }
                return res;
            })
            .then(function(data) {
                //TODO check if required
                if (!collectionId) {
                    data = sortPublication(data);
                }
                //filter empty syllabuses in Reader
                data = data.filter(function(pub) {
                    if (pub.type === 'StudyCourse') {
                        return pub.items.length > 0;
                    }
                    return true;
                });

                return {data:data};
            });


    }

    // copied from rest/publication.js
    function sortInGroup(array, groupProperty, sortProperty) {
        array = _.sortBy(_.pairs(_.groupBy(array, groupProperty)), function(item) {
            return parseFloat(item[0], 10) || 0;
        });
        array = _.map(array, function(item) {
            return _.sortBy(item[1], sortProperty);
        });
        return array;
    }

    // copied from rest/publication.js
    function sortPublication(publications) {
        var sortedPublications = [];
        var priorityAuthor = _.filter(publications, function(publication) {
            return (publication.type === 'Book' || publication.type === "Collection") && publication.weight >= 10;
        });

        var priorityDifficulty = _.filter(publications, function(publication) {
            return publication.type === 'Book' && publication.weight < 10;
        });

        var collections = _.filter(publications, function(publication) {
            return publication.type === "Collection" && publication.weight < 10;
        });

        var studyPublication = _.filter(publications, function(publication) {
            return publication.type !== 'Book' && publication.type !== "Collection";
        });

        priorityAuthor = sortInGroup(priorityAuthor, 'weight', 'name').reverse();
        collections = sortInGroup(collections, 'weight', 'name');
        priorityDifficulty = sortInGroup(priorityDifficulty, 'weight', 'name');
        studyPublication = sortInGroup(studyPublication, 'type', 'name').reverse();

        sortedPublications = sortedPublications.concat(priorityAuthor, priorityDifficulty, collections, studyPublication);
        sortedPublications = Array.prototype.concat.apply([], sortedPublications);
        if (sortedPublications.length === publications.length) {
            publications = sortedPublications;
        }
        return publications;
    }

    function persistDefaultStudyGuide(req) {
        return Publication.setDefaultStudyGuide(req.bookId, req.defaultStudyGuideId);
    }

    function persistCurrentStudyGuide(req) {
        //req.bookId
        //req.currentStudyGuideId
        return UserStudy.setCurrentStudyGuide(req.bookId, req.currentStudyGuideId)
            .then(function() {
                return Promise.all([
                    UserStudy.get(req.currentStudyGuideId),
                    Publication.getById(req.bookId)
                ]);
            })
            .then(function(res) {
                var activity = res[0];
                var pub = res[1];
                return {
                    "_id": req.bookId,
                    "name": pub.name,
                    "author": pub.author,
                    "cover": pub.cover,
                    "type": pub.type,
                    "difficulty": pub.difficulty,
                    "progress": activity.readingProgress || 0,
                    "readingTime": pub.readingTime,
                    "lastReadingTime": pub.lastReadingTime,
                    "publicationType": pub.publicationType
                };
            });
    }

    //TODO check
    function getDetails(req) {
        return Publication.getById(req.id);
    }

}); ///////////////
