define([
    './DB',
    '../tools',
    '../dao/UserStudy',
    //'underscore',
], function( /*_,*/DB, tools, UserStudy) {
    "use strict";
    var Promise = tools.Promise;
    var prefix = DB.prefix.pub + '-';
    //
    function _prefix(pubId){
        if (!("" + pubId).startsWith(prefix)) {
            pubId = prefix + pubId;
        }
        return pubId;
    }
    //
    function _convertId(book){
        return book && (book.content.originalId || book._id.split('-')[1]);
    }


    /////////////////////////////////////////
    return {
        getById: getById,
        getByIds: getByIds,
        getMyBooks: getMyBooks,
        setMyBooks: setMyBooks,
        getByOptions: getByOptions,
        getRelatedStudyGuides: getRelatedStudyGuides,
        setDefaultStudyGuide: setDefaultStudyGuide
    };


    // PUBLIC ///////////////////////////////////////

    /**
     *
     */
    function get(id) {
        return DB.public().get(id);
    }

    /**
     *
     */
    function getById(pubId, classId) {
        return Promise.all([get(_prefix(pubId)), UserStudy.getPublicationSummary(classId || pubId)])
            .catch(function(e){
                e.details = e.details || 'Publication.getById error: pubId=' + pubId + '; classId=' + classId + '.';
                throw e;
            })
            .then(function(data){
                return convertBook(data[0], null, data[1]);
            });

    }

    /**
     *
     * https://pouchdb.com/api.html#batch_fetch
     * The rows are returned in the same order as the supplied keys array.
     */
    function getByIds(pubIds) {
        pubIds = pubIds || [];

        return Promise.all([
                DB.public().getAll({keys: pubIds.map(_prefix)}),
                UserStudy.getPublicationsSummary(pubIds)
            ])
            .then(function(data){
                return convertBooks(data[0], null, data[1]);
            });
    }


    /**
     *
     */
    function getMyBooks() {
        return DB.userRW().get('books')
            .catch(function( /*err*/ ) {
                return _getEmptyMyBooks();
            });
    }

    /**
     *
     */
    function setMyBooks(books) {
        return DB.userRW().put(books);
    }


    function getByOptions(opts, _myBooks) {
        opts = opts || {};

        if(opts.key){
            opts.key = _prefix(opts.key);
        }
        if(opts.keys){
            opts.keys = opts.keys.map(_prefix);
        }
        if(opts.startkey){
            opts.startkey = _prefix(opts.startkey);
        }
        if(opts.endkey){
            opts.endkey = _prefix(opts.endkey);
        }

        //
        _myBooks = (_myBooks || []).map(_prefix);
        return DB.public().getAll(opts)
            .then(function(res) {
                return res.filter(function(pub) {
                    return pub.type === 'publication' && pub.distribution.scope !== 'supplemental' && pub.content.status;
                });
            })
            .then(function(books) {

                var pubIds = books.map(_convertId);

                return UserStudy.getPublicationsSummary(pubIds)
                    .then(function(stats){
                        return convertBooks(books, _myBooks, stats);
                    });
            });
    }


    // PRIVATE ///////////////////////////////////////

    /**
     *
     */
    function _getEmptyMyBooks(){
        return {
                    _id: 'books',
                    type: 'meta',
                    ids: []
                };
    }

    /**
     * _bookSummaries: object {pubId: <summary> }
     */
    function convertBooks(books, _myBooks, _bookSummaries) {
        books = books || [];
        return books.map(function(book) {
            return convertBook(book, _myBooks, _bookSummaries[_convertId(book)] );
        }).filter(function(item){ return !!item; });
    }




    /**
     * convert book from pouch format to legacy format
     */
     /*
         {
          "id": "cd7716f3ba2978dc65b4dbcc3522ca85",
          "author": "Sarah Orne Jewett",
          "name": "Old Friends",
          "cover": "cd7716f3ba2978dc65b4dbcc3522ca85",
          "category": "short story",
          "type": "Book",
          "description": "",
          "wordsCount": 58861,
          "readingTime": 25200000,
          "difficulty": 15,
          "paraCount": 483,
          "language": "en",
          "audio": false,
          "personal": true,
          "readingProgress": 1,
          "readingDuration": 0
        }
    */

    function convertBook(book, _myBooks, bookSummary) {

        if(!book){
            return null;
        }

        _myBooks = _myBooks || [];
        bookSummary = bookSummary || {};
        book.content = book.content || {};
        book.distribution = book.distribution || {};
        var isCollection = book.pubType === 'collection' || book.pubType === 'syllabus';

        var name;
        var result = {};

        // copy all content fields
        for (name in book.content) {
            if (book.content.hasOwnProperty(name)) {
                result[name] = book.content[name];
            }
        }


        // some special fields
        var extra = {
            "_id"   : _convertId(book),
            "id"    : _convertId(book),
            "author": book.content.authors && book.content.authors.join(', ') || "",
            "name"  : book.content.title,
            "type"  : getPublicationType(book),
            "publicationType"  : isCollection ? "Collection" : "Book",  // OLD

            "collection" : tools.getValue(book, 'distribution.collection.parent'),
            "personal"   : (_myBooks.indexOf(book._id) >= 0),

            "tableOfContents" : book.content.toc,

            "readingProgress" : bookSummary.readingProgress || 0,
            "progress"        : bookSummary.readingProgress || 0, // OLD

            "readingDuration" : bookSummary.readingDuration || 0,
            "lastReadingTime" : bookSummary.lastOpenedAt,
            "difficulty"      : book.content.difficulty || book.distribution.collection.topDifficulty,
            "wordsNumber"     : book.content.wordsCount,
            "defaultStudyGuideId" : book.content.defaultNotes
        };
        for (name in extra) {
            if (extra.hasOwnProperty(name)) {
                result[name] = extra[name];
            }
        }

        result.publicationType =  book.content.publicationType || result.type;

        if (isCollection) {
            result.items = tools.getValue(book, 'distribution.collection.contains') || [];
            result.matches = result.items.length;
        }

        if (book.pubType === 'notes') {
            if (result.essays) {
                result.essayTask = result.essays.map(function(e) {
                    e.type = 'EssayTask';
                    return e;
                });
            }

            var quizCount = 0;
            result.quizzes = result.quizzes || [];
            result.test = result.quizzes.map(function(test) {
                test.testQuestionsCount = test.questions.length;
                test.testType = test.type;
                test.type = 'Test';
                test.publicationId = result._id;

                if (test.testType === 'Quiz') {
                    quizCount++;
                }
                return test;
            });

            setStudyGuideItems(result.notes);
            setStudyGuideItems(result.bookmarks);
            setStudyGuideItems(result.comments);
            setStudyGuideItems(result.discussionTasks);

            result.discussionTasks = result.discussionTasks || [];
            result.discussionTasks.forEach(function(i) {
                i.type = 'discussion task';
            });

            result.exercises = {
                "numberExercises": result.quizzes.length,
                "numberQuizQusetions": quizCount,
                "flashcards": result.quizzes.length - quizCount,
                "essaysWordLimit": countEssaysWordLimit(result.essayTask),
                "microJournaling": result.exercises.microJournaling,
                "discussionTask": result.discussionTasks.length
            };

            delete result.quizzes;
            delete result.essays;
        }

        // delete fields
        delete result.originalId;
        delete result.authors;
        delete result.title;
        delete result.content;
        delete result.toc;


        return result;
    }

    function setStudyGuideItems(items) {
        if (items) {
            items.forEach(setStudyGuideIdentifier);
        }
    }

    function setStudyGuideIdentifier(i) {
        i.studyGuide = true;
    }

    function countEssaysWordLimit(essays) {
        var count = 0;
        (essays || []).forEach(function(e) {
            count += parseInt(e.wordsLimit, 10);
        });

        return count;
    }

    function getPublicationType(publication) {
        switch (publication.pubType) {
            case 'book' : return 'Book';
            case 'collection' : return 'Collection';
            case 'syllabus' : return 'StudyCourse';
            case 'notes' : return 'StudyGuide';
        }
    }

    function getRelatedStudyGuides(bookId) {
        return DB.public().getAll()
            .then(function(data) {
                return data.filter(function(pub) {
                    return pub.pubType === 'notes' && pub.content.bookId === bookId && pub.content.status;
                })
                .map(function(res) {
                    return convertBook(res);
                });
            });
    }

    function setDefaultStudyGuide(pubId, guideId) {
        DB.public().get(DB.id.pub(pubId))
            .then(function(pub) {
                pub.content.defaultNotes = guideId;

                return DB.public().put(pub);
            })
            .then(function() {
                DB.userRW().createTask({
                    pub: DB.id.pub(pubId),
                    guide: guideId
                }, 'publication-guide');
            });
    }



});
////////////////////////////////////////////
