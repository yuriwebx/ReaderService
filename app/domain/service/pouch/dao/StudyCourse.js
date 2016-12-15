define([
    './Publication',
    './DB',
    '../tools'
], function(Publication, DB, tools) {
    "use strict";

    return {
      get : get
    };

    ////////////////////////////

    /**
     *
     */
    function get(syllabusId, collapseCourses){
      return _getDoc(syllabusId)
          .then(function(data) {
              return tools.Promise.all([
                  extendItems([data], collapseCourses),
                  data
              ]);
          })
          .then(convertCourse);
    }


    /**
     *
     */
    function _getDoc(syllabusId){
      return DB.public().get(DB.id.pub(syllabusId));
    }

    function extendItems (items, collapseCourses) {
        return collapseCourses ? tools.Promise.resolve(items) : flattenItems(items);
    }

    function flattenItems (items) {
        var pubIds = [];

        items.forEach(function (item) {
            if (item.pubType === 'syllabus') {
                item.distribution.collection.contains.forEach(function(i) {
                    pubIds.push(DB.id.pub(i.studyGuideId || i.bookId));
                });
            }
        });

        if (pubIds.length) {
            return DB.public().getByKeys(pubIds)
                .then(function (pubs) {
                    var res = [];

                    items.forEach(function(item) {
                        if (item.pubType === 'syllabus') {
                            item.distribution.collection.contains.forEach(function(i) {
                                var info = pubs.filter(function(p) {
                                    return p._id === DB.id.pub(i.studyGuideId || i.bookId);
                                })[0];

                                if (info) {
                                    info.id = i.studyGuideId || i.id;
                                    info._id = info.content.originalId;

                                    var fields = ['author', 'bookId', 'description', 'finishingParagraphId', 'id', 'name', 'paragraphId', 'studyGuideId'];

                                    fields.forEach(function(name) {
                                        info[name] = i[name] || info[name];
                                    });

                                    res.push(info);
                                }
                                //vocabulary assessment
                                else {
                                    res.push(i);
                                }

                            });
                        }
                        else {
                            res.push(item);
                        }
                    });

                    return flattenItems(res);
                });
        }
        return items;
    }

    function convertCourse(res) {
        var data = res[1];
        var items = res[0].filter(function(it) {
            return it._id !== data._id;
        });
        var studyGuideIds = items.map(function(it) {
            return it.studyGuideId;
        }).filter(Boolean);
        var bookIds = items.map(function(it) {
            return it.bookId;
        }).filter(Boolean);

        var guides;
        var books;
        if (studyGuideIds && studyGuideIds.length) {
            guides = Publication.getByIds(studyGuideIds);
            books = Publication.getByIds(bookIds);
        }
        else {
            guides = tools.Promise.resolve();
            books = tools.Promise.resolve();
        }

        return tools.Promise.all([guides, books, Publication.getById(data.content.originalId)])
            .then(function(res) {
                var guides = res[0];
                var books = res[1];
                var pub = res[2];
                return {
                    "_id": data._id,
                    "author": data.content.authors[0], //TODO
                    "name": data.content.title,
                    "description": data.content.description,
                    "wordsCount": data.distribution.collection.totalWordsCount,
                    "difficulty": data.distribution.collection.topDifficulty,
                    "readingTime": data.content.readingTime,
                    "type": data.content.category,
                    "category": data.content.category,
                    "studyCourseItems": items.map(convertItem(guides, books)),
                    "bookAuthor": pub.bookAuthor,
                    "bookCover": pub.bookCover,
                    "bookName": pub.bookName
                };
            });
    }

    function convertItem(guides, books) {
        return function(item) {
            if (item.type === 'vocabulary assessment item' || item.type === 'section item') {
                return item;
            }
            var res = {
                "type": "Book",
                "cover": item.content.cover,
                "wordsCount": item.content.wordsCount,
                "difficulty": item.content.difficulty,
                "readingTime": item.content.readingTime,
                "category": item.content.category,

                "author": item.author || item.content.authors[0],
                "bookId": item.bookId || item.content.originalId || item._id,
                "description": item.description || item.content.description,
                "id": item.id || item.content.originalId,
                "name": item.name || item.content.title,
                "finishingParagraphId": item.finishingParagraphId,
                "paragraphId": item.paragraphId
            };
            if (item.studyGuideId) {
                var studyGuide = guides.filter(function(guide) {
                    return guide._id === item.studyGuideId;
                })[0] || {};
                var book = books.filter(function(book) {
                    return book._id === item.bookId;
                })[0] || {};

                res.studyGuideId = item.studyGuideId;
                res.studyGuideName = studyGuide.name;
                res.studyGuideAuthor = studyGuide.author;
                res.cover = book.cover;
                res.category = book.category;
            }
            return res;
        };
    }

});