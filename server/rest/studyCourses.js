/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var utils   = require('../utils/utils.js');
   var config  = require(__dirname + '/../utils/configReader.js');
   var q       = require('q');
   var _       = require('underscore');
   var _s      = require('underscore.string');
   var db      = require('./dao/utils').findDB();
   var publications        = require('./publication.js');
   var applicationSession  = require('./bl/applicationSessions');
   var manageUsers         = require('./manageUsers.js');
   var blocks              = require('./fetchblocks.js');
   var vocabulary          = require('./vocabulary.js');
   var materials           = require('./materials.js');
   var descriptionSalt     = 'created by ';
   var publicationProperties = [
      '_id',
      'bookId',
      'author',
      'name',
      'cover',
      'description',
      'wordsCount',
      'difficulty',
      'readingTime',
      'type',
      'category',
      'audio',
      'mediaSize'
   ];
   var emptyStudyCourse = {
      name        : 'New Syllabus',
      category    : 'StudyCourse',
      type        : 'StudyCourse',
      status      : true,
      language    : 'en',
      readingTime : 0,
      wordsCount  : 0,
      difficulty  : 0
   };

   var getStudyCourse = function (id, collapseCourses) {
      var studyCourse = {};

      return publications.getCompactDetails([id], publicationProperties)
         .then(function OnGetPublication(details) {
            studyCourse = details[id] || studyCourse;
            return q.ninvoke(db,
               'view',
               'Views',
               'studycourseItemByPublicationId', {
                  key : id,
                  include_docs : true
               });
         })
         .then(function onExtendItems(response) {
            var studyItems = [];
            if (response[0].rows.length) {
               studyItems = response[0].rows[0].doc.studyCourseItems;
            }
            return extendItems(studyItems, collapseCourses);
         })
         .then(function onStudyCourseComplete(extendedItems) {
            studyCourse.studyCourseItems = extendedItems;
            var studyGuideItems = _.filter(studyCourse.studyCourseItems, function(item) {
               return _.has(item, 'studyGuideId');
            });
            var studyGuideIds = _.map(studyGuideItems, function(item) {
               return item.studyGuideId;
            });
            var bookIds = _.map(studyGuideItems, function(item) {
               return item.bookId;
            });
            if (studyGuideIds.length) {
               return q.all([publications.getCompactDetails(studyGuideIds, ['author', 'name', 'bookId']),
                             publications.getCompactDetails(bookIds, ['category', 'cover'])]);
            }
         })
         .then(function(response) {
            if (!_.isEmpty(response)) {
               var studyGuidesDict = response[0];
               var publicationDict = response[1];

               studyCourse.studyCourseItems = _.map(studyCourse.studyCourseItems, function (item) {
                  var studyGuide = {};
                  var publication = {};
                  if (_.has(item, 'studyGuideId')) {
                     studyGuide = studyGuidesDict[item.studyGuideId];
                     publication = publicationDict[studyGuide.bookId];

                     item.studyGuideName = studyGuide.name;
                     item.studyGuideAuthor = studyGuide.author;
                     item.cover = publication.cover;
                     item.category = publication.category;
                     _.defaults(item, studyGuide);
                  }
                  return item;
               });
            }
            return publications.getCompactDetails([studyCourse.bookId], ['name', 'author', 'cover']);
         })
         .then(function(response){
            if(response[studyCourse.bookId]) {
               studyCourse.bookAuthor = response[studyCourse.bookId].author;
               studyCourse.bookCover = response[studyCourse.bookId].cover;
               studyCourse.bookName = response[studyCourse.bookId].name;
            }
            return studyCourse;
         })
         .catch(_onError);
   };

   var persistStudyCourse = function (runId, studyCourse) {
      var _studyCourse = {};
      var publicationId;
      var userId;
      return applicationSession.getUserId(runId)
         .then(function OnGetUser(_userId) {
            userId = _userId;
            return manageUsers.getUserProfile(userId);
         })
         .then(function OnUpdatePublication(userData) {
            var userInfo = userData.userProfileInfo;
            var publication = _.pick(studyCourse, publicationProperties);

            _.defaults(publication, emptyStudyCourse);
            publication.difficulty = parseFloat(publication.difficulty);
            publication.author = userInfo.firstName + ' ' + userInfo.lastName;
            publication.description = publication.description ||
               descriptionSalt + publication.author;
            publication.userId = userId;

            return publications.persistPublication(publication);
         })
         .then(function OnUpdateUserPublication(id) {
            publicationId = id;
            _studyCourse = {
               publicationId: publicationId,
               type: 'StudyCourseItem',
               studyCourseItems: studyCourse.studyCourseItems || []
            };
            return q.ninvoke(db, 'view', 'Views',
               'studycourseItemByPublicationId', {
                  key : publicationId,
                  include_docs : true
               });
         })
         .then(function onUpdateStudyCourse(response) {
            var body = response[0];
            var insData = {};

            if (body.rows && body.rows.length) {
               insData = body.rows[0].doc || insData;
            }
            _.extend(insData, _studyCourse);

            return q.ninvoke(db, 'insert', insData);
         })
         .then(function onEnd() {
            return publicationId;
         })
         .catch(_onError);
   };

   var parseLocator = function (locator) {
      var replacePart = 'para_';
      locator = locator.replace(replacePart, '');
      locator = parseInt(locator, 10);
      locator = isNaN(locator) ? 0 : locator;
      return locator;
   };
   //TODO: move to common utils
   var parseExercises = function (exercises) {
      var response = {
         essaysWordLimit      : 0,
         flashcards           : 0,
         numberExercises      : 0,
         numberQuizQusetions  : 0,
         microJournaling      : 0
      };
      _.each(exercises, function (exercise) {
         if (exercise.type === "EssayTask") {
            response.numberExercises += 1;
            response.essaysWordLimit += parseInt(exercise.wordsLimit, 10);
         }
         else if (exercise.testType === "Quiz") {
            response.numberExercises += 1;
            response.numberQuizQusetions += exercise.testQuestions ? exercise.testQuestions.length : exercise.testQuestionsCount;
         }
         else if (exercise.testType === "Flashcard") {
            response.numberExercises += 1;
            response.numberQuizQusetions += exercise.testQuestions ? exercise.testQuestions.length : exercise.testQuestionsCount;
         }
      });
      return response;
   };

   var getExercises = function (bookId, _start, _end) {
      var parsedStart = parseLocator(_start);
      var parsedEnd = parseLocator(_end);
      return materials.getExercises({
         bookId: bookId
      }).then(function (exercises) {
         if (parsedStart <= parsedEnd) {
            exercises = _.filter(exercises, function (exercise) {
               var locator = exercise.locator.paragraphId || exercise.locator;
               locator = parseLocator(locator);
               return parsedStart <= locator && locator <= parsedEnd;
            });
            exercises = parseExercises(exercises);
            return exercises;
         }
         else {
            exercises = parseExercises({});
            return exercises;
         }
      });
   };

   var calcBookRangeProperties = function (runId, bookId, paragraphRange) {
      var deferred = q.defer();
      var content = {};
      var textContent = '';
      var wordsCount = 0;
      var exercise = {};
      var publicationId = '';
      paragraphRange = JSON.parse(paragraphRange);
      var _start = paragraphRange.start;
      var _end = paragraphRange.end || _start;
      if (!_start) {
         deferred.resolve({
            wordsCount: 0,
            readingTime: 0,
            difficulty: 0
         });
      }
      else {
         applicationSession.getUserId(runId)
            .then(function () {
               return publications.get(bookId);
            })
            .then(function (publication) {
               if (publication.type === 'Book') {
                  publicationId = publication._id;
               }
               else if (publication.type === 'StudyGuide') {
                  publicationId = publication.bookId;
               }
               if (publicationId) {
                  return blocks.fetch(publicationId, publication.version[0].content, _start, _end);
               }
               else {
                  deferred.reject(utils.addSeverityResponse('Not valid publication type ' + publication.type + '.', config.businessFunctionStatus.error));
               }
            })
            .then(function (bookContent) {
               content = bookContent;
               return getExercises(bookId, _start, _end);
            })
            .then(function (bookExercises) {
               exercise = bookExercises;
               textContent = _s.stripTags(content.join(''));
               wordsCount = (textContent.match(/\S+/g) || []).length;
               return vocabulary.calculateTextDifficulty(textContent);
            })
            .then(function (response) {
               deferred.resolve({
                  wordsCount  : wordsCount,
                  readingTime : (Math.round(wordsCount / 180) * 60000 + utils.calculateReadingTime(exercise)) || 60000,
                  difficulty  : response.status === 'OK' ? response.data : 0
               });
            })
            .catch(deferred.reject);
      }
      return deferred.promise;
   };

   function extendItems (items, collapseCourses) {
      return q(collapseCourses ? items : flattenItems(items))
         .then(function (expandedItems) {
            var validTypes = ['Book', 'StudyGuide', 'StudyCourse'];
            var publicationIndexes = [];
            var publicationIds = [];
            var result = expandedItems;

            _.each(expandedItems, function (item, index) {
               if (validTypes.indexOf(item.type) > -1) {
                  publicationIndexes.push(index);
                  publicationIds.push(item.studyGuideId || item.bookId || item.id);
               }
            });

            if (publicationIds.length) {
               result = publications.getCompactDetails(publicationIds, publicationProperties.concat(['exercises']))
                  .then(function (publicationsMap) {
                     _.each(publicationIds, function (id, index) {
                        var details = publicationsMap[id];
                        prettifyItem(expandedItems[publicationIndexes[index]], details);
                     });
                     return expandedItems;
                  });
            }
            return result;
         });
   }

   function flattenItems (items) {
      var idsIndexes = [];
      var coursesIds = [];
      var result = q(items);

      _.each(items, function (item, index) {
         if (item.type === 'StudyCourse') {
            idsIndexes.push(index);
            coursesIds.push(item.bookId || item.id);
         }
      });

      if (coursesIds.length) {
         result = q.ninvoke(db, 'view', 'Views', 'studycourseItemByPublicationId', {
            keys : coursesIds,
            include_docs : true
         })
         .then(function (response) {
            for (var i = idsIndexes.length - 1; i > -1; i--) {
               var course = response[0].rows[i].doc;
               replaceItemWithList(items, idsIndexes[i], course.studyCourseItems);
            }
            return flattenItems(items);
         });
      }
      return result;
   }

   function prettifyItem (sourceItem, extendedInfo) {
      extendedInfo.readingTime += utils.calculateReadingTime(extendedInfo.exercises);
      _.defaults(sourceItem, extendedInfo);
      delete sourceItem._id;
      delete sourceItem.exercises;
   }

   function replaceItemWithList (arr, index, list) {
      [].splice.apply(arr, [index, 1].concat(list));
   }

   function _onError (err) {
      return q.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
   }

   module.exports = {
      persistStudyCourse      : persistStudyCourse,
      getStudyCourse          : getStudyCourse,
      calcBookRangeProperties : calcBookRangeProperties,
      flattenCourseItems      : flattenItems
   };

})();