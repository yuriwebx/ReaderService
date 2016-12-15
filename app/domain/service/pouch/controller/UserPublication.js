define([
    '../tools',
    '../dao/Publication',
    '../dao/UserStudy',
    '../dao/StudyClass'
], function(tools, Publication, UserStudy, StudyClass) {
    "use strict";

    var MySet = tools.MySet; //FIX:
    var Promise = tools.Promise;

    return {
        POST:{
            update: update
        },
        GET:{
            getRecentBooks: getRecentItems
        }
    };

    function update(data) {
        var pubId = data.userPublication.publicationId;
        var isPersonal = data.userPublication.personal;

        return UserStudy.get(pubId)
            .then(function(res) {
                res.lastOpenedAt = data.userPublication.lastOpenedAt || res.lastOpenedAt;
                res.isClass = res.isClass || data.userPublication.publicationType === 'StudyClass';
                res.personal = isPersonal;
                return UserStudy.update(pubId, res)
                    .then(function() {
                        if (!res.isClass) {
                            return updateMyBooks(pubId, isPersonal);
                        }
                        return Promise.resolve();
                    });
            })
            .then(function() {
                return getRecentItems(1);
            })
            .then(function(res) {
                return res.lastItem;
            });
    }


    function updateMyBooks(id, add) {

        if (add === undefined) {
            return Promise.resolve();
        }

        return Publication.getMyBooks()
            .then(function(booksData) {
                booksData.ids = new MySet(booksData.ids || []);

                if (add) {
                    booksData.ids.add(id);
                }
                else {
                    booksData.ids.delete(id);
                }

                // booksData.ids = [...booksData.ids];
                //booksData.ids = Array.from(booksData.ids);
                booksData.ids = booksData.ids.toArray();

                return Publication.setMyBooks(booksData);
            });

    }

    /**
     * param = {isEditor: <boolean>} didn't used in reader app
     */
    function getRecentItems() {
        var numberOfRecentBooks = 15;

        return Promise.all([
            getRecentBooks(numberOfRecentBooks),
            getRecentCourses(numberOfRecentBooks)
        ])
            .then(function(res) {
                return {
                    books: res[0],
                    studyActivities: res[1]
                };
            })
            .then(addLastItem);
    }

    //from rest/userpublications.js
    function addLastItem(recentItems) {
        var lastBook = recentItems.books &&  recentItems.books[0];
        var lastCourse = recentItems.studyActivities && recentItems.studyActivities[0];
        var lastItem = {};
        if(lastBook && lastCourse) {
            lastItem =  lastBook.lastReadingTime > lastCourse.lastReadingTime  ? lastBook : lastCourse;
        }
        else if(lastBook) {
            lastItem = lastBook;
        }
        else if(lastCourse) {
            lastItem = lastCourse;
        }
        recentItems.lastItem = lastItem;

        return recentItems;
    }

    //TODO filter
    function getRecentCourses(numberOfRecentItems) {
        return UserStudy.getRecentId(numberOfRecentItems, true)
            .then(StudyClass.getByIds)
            .then(function(courses) {
                return courses.map(function(course) {
                    //TODO 1st check condition
                    if (course.type === 'StudyCourse' ||
                        (
                            (course.publicationType === 'StudyCourse' || !course.publicationType) &&
                            !course.cover
                        )
                    ) {
                        delete course.cover;
                    }

                    return course;
                })
                .sort(function(a, b) {
                    return b.lastReadingTime - a.lastReadingTime;
                });
            });
    }

    function getRecentBooks(numberOfRecentItems) {
        return UserStudy.getRecentId(numberOfRecentItems, false)
            .then(Publication.getByIds)
            .then(function(books) {
                // cut fields
                var fields = ['_id', 'author', 'cover', 'difficulty', 'lastReadingTime', 'name', 'progress', 'publicationType', 'readingTime', 'type', 'collection'];
                return tools.Promise.all(books.map(function(book){
                    var res = fields.reduce(function(result, name){
                        result[name] = book[name];
                        return result;
                    }, {});

                    if (book.type === "StudyGuide") {
                        res.studyGuide = book.name;

                        return Publication.getById(book.bookId)
                            .then(function(book) {
                                res.name = book.name;
                                res.author = book.author;
                                res.cover = book.cover;

                                return res;
                            });
                    }
                    return res;
                }));
            });
    }

}); ///////////////
