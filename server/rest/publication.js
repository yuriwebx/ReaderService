/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
    'use strict';

   var q             = require('q');
   var _ = require('underscore');

   var db = require('./dao/utils').findDB();

   var utils = require('../utils/utils.js');


   var unidecode     = require('unidecode');
   var config        = require(__dirname + '/../utils/configReader.js');
   var manageUsers      = require('./manageUsers.js');
   var userPublication  = require('./userpublications.js');
   var studyGuide  = require('./studyGuide.js');
   var blocks = require('./fetchblocks.js');
   var logger = require('../utils/logger.js').getLogger(__filename);

   var _db = {
      view    : q.nbind(db.view, db, 'Views'),
      insert  : q.nbind(db.insert, db),
      bulk    : q.nbind(db.bulk, db),
      destroy : q.nbind(db.destroy, db)
   };

   var emptyArray = [];
   var predefinedContentTypes = [
      'Dictionary',
      'StudyGuide',
      'StudyCourse',
      'StudyClass',
      'Collection'
   ];

   var persistPublication = function (publication) {
      var deferred = q.defer();
      var reason = {};
      if (publication._id) {
         db.get(publication._id, {
            revs_info: true
         }, function (err, body) {
            if (err) {
               reason = utils.addSeverityResponse(config.errorMessages[err.description], config.businessFunctionStatus.error);
               deferred.reject(reason);
            }
            _.extend(body, publication);
            db.insert(body, function (err, body) {
               if (err) {
                  reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
                  deferred.reject(reason);
               }
               else {
                  deferred.resolve(body.id);
               }
            });
         });
      }
      else {
         db.insert(publication, function (err, body) {
            if (err) {
               reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               deferred.reject(reason);
            }
            deferred.resolve(body.id);
         });
      }

      return deferred.promise;
   };

   //set
   var savePublication = function (publication) {
      var deferred = q.defer();
      var reason = {};
      db.insert(publication, function (err, body) {
         if (err) { //possible duplicate error
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(reason);
         }
         else {
            deferred.resolve(publication._id || body.id);
         }
      });

      return deferred.promise;
   };

   var updatePublication = function (publication) {
      var deferred = q.defer();

      getPublication(publication._id).then(function (body) {
         _.extend(body, publication);
         savePublication(body).then(function (id) {
            deferred.resolve(id);
         }, deferred.reject);
      }, deferred.reject);

      return deferred.promise;
   };

   //setAll
   function saveAllPublication(publications) {
      var deferred = q.defer();
      var reason = {};
      db.bulk({
         docs: publications
      }, function (error) {
         if (error) {
            reason = utils.addSeverityResponse(error.description, config.businessFunctionStatus.error);
            deferred.reject(reason);
         }
         else {
            deferred.resolve({});
         }
      });
      return deferred.promise;
   }

   //get
   var getPublication = function (id) {
      var deferred = q.defer();
      db.get(id, function (err, body) {
         if (err || !body.status) {
            var message = err !== null ? err.description : 'Publication was removed from db';
            deferred.reject(utils.addSeverityResponse(message, config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(body);
         }
      });

      return deferred.promise;
   };
   //getAll
   var getAllPublication = function (total) {
      var deferred = q.defer();
      var dbView = total ? 'publicationsGetAll' : 'publicationsGetActive';
      var response = [];
      try {
         db.view('Views', dbView, {
            include_docs: true
         }, function (err, body) {
            if (err) {
               deferred.resolve(emptyArray);
            }
            else if (body.rows.length) {
               response = [];
               for (var i = 0; i < body.rows.length; i++) {
                  response.push(body.rows[i].doc);
               }
               deferred.resolve(response);
            }
            else {
               deferred.resolve(emptyArray);
            }
         });
      } catch (e) {
         deferred.resolve(emptyArray);
      }
      return deferred.promise;
   };
   //updateAll
   var updateAllPublication = function (publications) {
      var deferred = q.defer();
      var update = function (publications) {
         db.insert(publications[0], function (err) {
            if (err) {
               logger.error(JSON.stringify(publications[0]));
               utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               //logger.error(err.description);
            }
            if (publications.length !== 1) {
               publications.shift();
               update(publications);
            }
            else {
               deferred.resolve({});
            }
         });
      };
      update(publications);
      return deferred.promise;
   };
   //
   var deletePublication = function (id, rev) {
      var deferred = q.defer();
      var reason = {};
      db.destroy(id, rev, function (err) {
         if (err) {
            reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
            deferred.reject(reason);
         }
         else {
            deferred.resolve({});
         }
      });
      return deferred.promise;
   };

   var searchPublications = function (userId, filter, itemsCount, language,
      contentType, categories, personalPublications, collectionId) {
      var results = [];
      var dbView  = 'publicationsSearch';
      var dbList  = 'publicationsSearch';
      var dbQueryParams = {
         include_docs   : true,
         startkey       : [],
         endkey         : [{}, {}, {}],
      };
      filter = unidecode((filter || '').toLowerCase());
      itemsCount = +itemsCount;
      personalPublications = personalPublications === 'true';

      if (collectionId) {
         dbQueryParams.startkey = [collectionId];
         dbQueryParams.endkey = [collectionId, {}];
         dbView = 'publicationsCollections';
      }
      else {
         if (language) {
            dbQueryParams.startkey[0] = dbQueryParams.endkey[0] = language.toLowerCase();
            if (categories) { //multiply categories ?
               if (predefinedContentTypes.indexOf(categories) > -1) {
                  contentType = categories;
               }
               else {
                  contentType = 'Book';
                  dbQueryParams.startkey[2] = dbQueryParams.endkey[2] = categories;
               }
            }
            if (contentType) {
               dbQueryParams.startkey[1] = dbQueryParams.endkey[1] = contentType;
            }
         }
      }
      return q.ninvoke(db,
         'view_with_list',
         'Views',
         dbView,
         dbList,
         dbQueryParams)
      .then(function onDbSearch(response) {
         results = response[0];
         return userPublication.getPersonalPublications(userId);
      })
      .then(function onFilteringResults(personalsSet) {
         var matchesMap = {};

         if (!collectionId) {
            results = _.filter(results, function(item) {
               var pickFlag = true;
               item.personal = personalsSet.hasOwnProperty(item.id);
               pickFlag = !personalPublications || item.personal;
               pickFlag = pickFlag && (!filter.length || filterByCriteria(item, filter));

               if (pickFlag && item.collection && !personalPublications) {
                  matchesMap[item.collection] = matchesMap[item.collection] || 0;
                  matchesMap[item.collection]++;
                  pickFlag = false;
               }
               if (item.type === 'Collection') {
                  if (contentType !== 'Collection') {
                     item.matches = matchesMap[item.id];
                  }
                  pickFlag = item.matches;
               }

               return pickFlag;
            });
         }

         if (itemsCount) {
            results = results.slice(0, itemsCount);
         }
         return userPublication.getStudyProgress(userId,
            _.pluck(results, 'id'),
            'userStudiesPublication',
            'publicationId', {});
      })
      .then(function onExtendProgressProps(progressMap) {
         if (!collectionId) {
            results = sortPublication(results);
         }
         _.each(results, function(item) {
            if (progressMap[item.id]) {
               item.readingProgress = progressMap[item.id].readingProgress;
               item.readingDuration = progressMap[item.id].readingDuration;
            }
            else {
               item.readingProgress = 0;
               item.readingDuration = 0;
            }
            if (item.type === 'StudyGuide') {
               item.readingTime += utils.calculateReadingTime(item.exercises);
            }
            delete item.weight;
         });

         return {
            data     : results,
            status   : config.businessFunctionStatus.ok
         };
      })
      .catch(function onErr(err) {
         return utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
      });
   };

   function sortInGroup(array, groupProperty, sortProperty) {
      array = _.sortBy(_.pairs(_.groupBy(array, groupProperty)), function(item) {
         return parseFloat(item[0], 10) || 0;
      });
      array = _.map(array, function(item) {
         return _.sortBy(item[1], sortProperty);
      });
      return array;
   }

   function sortPublication(publications) {
      var sortedPublications = [];
      var proirityAuthor = _.filter(publications, function(publication){
         return (publication.type === 'Book' || publication.type === "Collection") && publication.weight >= 10;
      });

      var proirityDifficulty = _.filter(publications, function(publication){
         return publication.type === 'Book' && publication.weight < 10;
      });

      var collections = _.filter(publications, function(publication){
         return publication.type === "Collection" && publication.weight < 10;
      });

      var studyPublication = _.filter(publications, function(publication){
         return publication.type !== 'Book' && publication.type !== "Collection";
      });

      proirityAuthor = sortInGroup(proirityAuthor, 'weight', 'name').reverse();
      collections = sortInGroup(collections, 'weight', 'name');
      proirityDifficulty = sortInGroup(proirityDifficulty, 'weight', 'name');
      studyPublication = sortInGroup(studyPublication, 'type', 'name').reverse();

      sortedPublications = sortedPublications.concat(proirityAuthor, proirityDifficulty, collections, studyPublication);
      sortedPublications = Array.prototype.concat.apply([], sortedPublications);
      if(sortedPublications.length === publications.length) {
         publications = sortedPublications;
      }
      return publications;
   }

   //GetPublicationDetail
   var getPublicationDetails = function (uid, filter) {
      var deferred = q.defer();
      var reason = {};
      var message = '';

      var publicationId = null;

      if (_.has(filter, 'id')) {
         // promise = userPublication.getPublicationById(uid, filter.id);// getStudyProgress
         publicationId = filter.id;
      }
      else if (_.has(filter, 'externalId')) {
         // TODO
         publicationId = filter.externalId;
      }
      else {
         deferred.reject('Can not find publication for filter: ' + JSON.stringify(filter));
         return deferred.promise;
      }

      userPublication.getStudyProgress(uid, [publicationId],
         'userStudiesPublication', 'publicationId', {})
      .then(function (userPublication) {
         db.get(publicationId, function (err, publication) {
            if (err) {
               message = err.description;
               reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
               deferred.reject(reason);
            }
            db.view('Views', 'materialsStudyGuides', {
               key: [uid, publicationId],
               reduce: true
            }, function (err, materials) {
               if (err || publication === undefined) {
                  message = err !== null ? err.description + ' in BF  getPublicationDetails' : 'Publication status not active.';
                  reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
                  deferred.reject(reason);
               }
               else {
                  if (publication) {
                     for (var i = 0; i < publication.length; i++) { //fix type publication
                        if (typeof publication[i].type === 'undefined') {
                           publication[i].type = 'Book';
                        }
                     }
                     //set test info
                     if (publication.type === 'StudyGuide') {
                        publication.readingTime += utils.calculateReadingTime(publication.exercises);
                     }
                     //set notes and paraSize
                     if (materials && materials.rows.length) {
                        publication.notes = materials.rows[0].value[0];
                        publication.paragraphSummary = Boolean(materials.rows[0].value[1]);
                     }
                     //set reading info
                     if (_.has(userPublication, publicationId)) {
                        publication.readingProgress = userPublication[publicationId].readingProgress;
                        publication.readingDuration = userPublication[publicationId].readingDuration;
                     }

                     if (publication.type === 'StudyGuide') {
                        db.get(publication.bookId, function (err, body) {
                           if (body) {
                              publication.book = body;
                              deferred.resolve(publication);
                           }
                           else {
                              deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
                           }

                        });
                     }
                     else {
                        deferred.resolve(publication);
                     }
                  }
                  else {
                     message = 'not found publication by id ' + publicationId;
                     reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
                     deferred.reject(reason);
                  }
               }
            });
         }, deferred.reject);
      }, deferred.reject);
      return deferred.promise;
   };

   var searchStudyGuideByCriteria = function (criteria) {
      var deferred = q.defer();
      var reason = {};
      db.view_with_list('Views', 'studyGuides', 'publicationsSearchForTestImport', {
            criteria: criteria
         },
         function (err, body) {
            if (err) {
               reason = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
               deferred.reject(reason);
            }
            else { //?
               deferred.resolve(body);
            }
         });

      return deferred.promise;
   };

   var deferredDbViewWithList = q.nbind(db.view_with_list, db, 'Views');


   var getRelatedPublications = function (publicationId, includeThisPublication) {
      var dbQueryParams = {
         startkey       : [publicationId],
         endkey         : [publicationId, {}],
         include_docs   : true
      };
      var _includeThisPublication = includeThisPublication !== 'false';

      return deferredDbViewWithList('publicationsRelated', 'publicationsSimpleDocList', dbQueryParams)
      .spread(function (body) {
         _.each(body.studyGuides, function (publication) {
            delete publication.type;
            publication.readingTime += utils.calculateReadingTime(publication.exercises);
         });
         if (_includeThisPublication && body.book) {
            body.studyGuides.unshift(body.book);
         }
         return body.studyGuides;
      })
      .then(function (result) {
         return result.length ? result : q.ninvoke(db, 'get', publicationId).spread(function (publication) {
            publication.id = publication._id;
            delete publication._id;
            return [publication];
         });
      })
      .catch(function(err) {
         return utils.addSeverityResponse(err, config.businessFunctionStatus.error);
      });
   };

   var getRelatedPublicationsForStudyGuide = function (studyGuideId, includeThisPublication) {
      var deferred = q.defer();
      var response = [];

      function removeSelf(item) {
         return item.id !== studyGuideId;
      }

      getPublication(studyGuideId)
         .then(function (studyGuide) {
            if (includeThisPublication === 'true') {
               response.push({
                  id: studyGuide._id,
                  name: studyGuide.name,
                  author: studyGuide.author,
                  cover: studyGuide.cover,
                  category: studyGuide.category,
                  description: studyGuide.description
               });
            }
            return getRelatedPublications(studyGuide.bookId, 'true');
         })
         .then(function (relatedPublications) {
            delete relatedPublications[0].toc;
            deferred.resolve(response.concat(relatedPublications.filter(removeSelf)));
         })
         .catch(deferred.reject);

      return deferred.promise;
   };

   var getCompactDetails = function (ids, details) {
      return q.ninvoke(db, 'view', 'Views', 'publicationsGetActive', {
         'keys': ids,
         include_docs: true
      })
      .then(function (body) {
         var response = {};
         body[0].rows.forEach(function (row) {
            if (row.doc) {
               response[row.id] = _.pick(row.doc, details);
            }
         });
         return response;
      })
      .catch(function (err) {
         throw utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
      });
   };


   var createStudyGuide = function (id, bookId, userId) {
      var deferred = q.defer();
      var publication = {};
      getPublication(bookId).then(function (_publication) {
            publication = _publication;
            publication.type = "StudyGuide";
            publication.category = "StudyGuide";
            publication.cover = 'StudyGuide' + bookId;
            publication.bookId = bookId;
            publication.userIds = [];
            publication.name = 'Book Notes for ' + publication.name;
            publication._id = id;
            publication.status = true;
            publication = addExerciseObj(publication);
            delete publication._rev;
            delete publication.collection;

            return manageUsers.getUserProfile(userId);
         })
         .then(function (userData) {
            var userInfo = userData.userProfileInfo;

            publication.author = userInfo.firstName + ' ' + userInfo.lastName;
            return savePublication(publication);
         })
         .then(function () {
            return userPublication.updateUserPublication(userId, {
               publicationId: publication._id,
               publicationType: 'StudyGuide',
               personal: true
            });
         })
         .then(function(){
            var status = config.publicationConfig.StudyGuideEditorStatus.creator;
            return studyGuide.persistEditorsStatus(userId, publication._id, [userId], status, '');
         })
         .then(function () {
            deferred.resolve(publication._id);
         })
         .catch(deferred.reject);

      return deferred.promise;
   };

   var getLibraryParameters = function () {
      var dbQueryParams = {
         group: true
      };
      return q.ninvoke(db, 'view', 'Views', 'publicationsLibraryParameters', dbQueryParams)
         .spread(function (body) {
            var result = {
               libraryLanguages  : [],
               publicationGroups : []
            };
            var lastGroup = null;

            return _.reduce(body.rows, function (result, row) {
               if (!row.key[0]) {
                  result.libraryLanguages.push(row.key[1]);
               }
               else {
                  lastGroup = _.last(result.publicationGroups);
                  if (result.publicationGroups.length && lastGroup.name === row.key[1]) {
                     if (lastGroup.categories.indexOf(row.key[2]) < 0) {
                        lastGroup.categories.push(row.key[2]);
                     }
                  }
                  else {
                     result.publicationGroups.push({
                        name        : row.key[1],
                        contentType : row.key[1],
                        categories  : [row.key[2]]
                     });
                  }
               }
               return result;
            }, result);
         })
         .catch(function (err) {
            throw err;
         });
   };

   var persistExercise = function (object, property, value, action, summeryPropety) {
      value = parseInt(value, 10);
      value = isNaN(value) ? 0 : value;
      if (action === 'remove') {
         if (summeryPropety) {
            object[summeryPropety] -= 1;
         }
         object[property] -= value;
         object[property] = object[property] < 0 ? 0 : object[property];
         object[summeryPropety] = object[summeryPropety] < 0 ? 0 : object[summeryPropety];
      }
      else if (action === 'add') {
         if (summeryPropety) {
            object[summeryPropety] += 1;
         }
         object[property] += value;
      }
      else if (action === 'update') {
         object[property] += value;
      }
      return object;
   };

   var addExerciseObj = function (publication) {
      var exercisesObj = {
         exercises: {
            numberExercises: 0,
            numberQuizQusetions: 0,
            flashcards: 0,
            essaysWordLimit: 0,
            microJournaling: 0,
            discussionTask: 0
         }
      };
      if (!_.has(publication, 'exercises')) {
         publication = _.extend(publication, exercisesObj);
      }
      return publication;
   };

   var exercisePersistRule = {
      'Quiz': function (publication, exercise, action) {
         var object = publication.exercises,
            property = 'numberQuizQusetions',
            value = exercise.testQuestionsCount,
            summeryPropety = 'numberExercises';
         publication.exercises = persistExercise(object, property, value, action, summeryPropety);
         return publication;
      },
      'Flashcard': function (publication, exercise, action) {
         var object = publication.exercises,
            property = 'flashcards',
            value = exercise.testQuestionsCount,
            summeryPropety = 'numberExercises';
         publication.exercises = persistExercise(object, property, value, action, summeryPropety);
         return publication;
      },
      'EssayTask': function (publication, exercise, action) {
         var object = publication.exercises,
            property = 'essaysWordLimit',
            value = exercise.wordsLimit,
            summeryPropety = 'numberExercises';
         publication.exercises = persistExercise(object, property, value, action, summeryPropety);
         return publication;
      },
      'discussion task': function(publication, exercise){
         var currentNumberDiscussionTask = exercise.discussionTasks.length;
         var diffNumberDiscussionTask = currentNumberDiscussionTask - publication.exercises.discussionTask;
         publication.exercises.numberExercises += diffNumberDiscussionTask;
         publication.exercises.discussionTask = currentNumberDiscussionTask;
         return publication;
      },
      'microJournaling': function (publication, exercise) {
         exercise.paraSize = parseInt(exercise.paraSize, 10);
         exercise.paraSize = isNaN(exercise.paraSize) ? 0 : exercise.paraSize;
         var object = publication.exercises,
            property = 'microJournaling',
            value = 0;
         return blocks.fetchAll(publication.bookId, publication.version[0].content)
         .then(function (contentItems) {
            if (exercise.paraSize !== 0) {
               contentItems = _.map(contentItems, function (item) {
                  var wordsCount = item.match(/data-words-count=\"(\d+)\"/);
                  wordsCount = wordsCount !== null && wordsCount.length === 2 ? wordsCount[1] : 0;
                  return parseInt(wordsCount, 10);
               }).filter(function (numberWords) {
                  return numberWords > exercise.paraSize;
               });
               value = contentItems.length;
               var updateValue = publication.exercises.microJournaling !== 0 ? value - publication.exercises.microJournaling : value;
               var action = updateValue === value ? 'add' : 'update';
               publication.exercises = persistExercise(object, property, updateValue, action);
            }
            else {
               publication.exercises.microJournaling = 0;
            }
            return publication;
         });
      }
   };

   function persistExercises(exercise, action) {
      var deferred = q.defer();
      if (exercise.publicationId) {
         db.get(exercise.publicationId, function (err, publication) {
            if (err) {
               deferred.reject(utils.addSeverityResponse(err.description + ' in BF persistExercises.', config.businessFunctionStatus.error));
            }
            else if (publication) {
               var type = exercise.testType || exercise.type;
               publication = addExerciseObj(publication);
               q.when(exercisePersistRule[type](publication, exercise, action))
               .then(function (publication) {
                  db.insert(publication, function (err) {
                     if (err) {
                        deferred.reject(err);
                     }
                     deferred.resolve({
                        status: config.businessFunctionStatus.ok
                     });
                  });
               })
               .fail(function(reason) {
                  reason = utils.addSeverityResponse(reason, config.businessFunctionStatus.error);
                  deferred.reject(reason);
               });

            }
            else {
               deferred.reject(utils.addSeverityResponse('Publication has not found by publicationId.', config.businessFunctionStatus.error));
            }
         });
      }
      else {
         deferred.reject(utils.addSeverityResponse('Exercise has not publicationId.', config.businessFunctionStatus.error));
      }
      return deferred.promise;
   }

   function getBookInfo(userId, id) {
      var result = new EmptyResult(id);

      return q.ninvoke(db, 'get', id)
         .spread(function getPublicationSummary(data) {
            result.book = new PublicationSummary(data);
            result.tableOfContents = data.toc || [];
            return userPublication.getPublicationSummaryById(userId, result.book.id);
         })
         .then(function getUserPublicationSummary(publicationSummary) {
            result.book.userPublication = new UserPublicationSummary(publicationSummary);
            if (publicationSummary && _.has(publicationSummary, 'currentStudyGuideId')) {
               result.currentStudyGuideId = publicationSummary.currentStudyGuideId;
            }
            return q.ninvoke(db, 'view', 'Views', 'publicationsRelated', {
               startkey : [id],
               endkey   : [id, {}],
               include_docs : true
            });
         })
         .spread(function getRelatedStudyGuides(data) {
            result.relatedStudyGuides = data.rows.map(function (row) {
               return new PublicationSummary(row.doc);
            });
            return q.ninvoke(db, 'view', 'Views', 'defaultStudyGuideByBookId', {
               startkey : [id],
               endkey   : [id, {}]
            });
         })
         .spread(function getDefaultStudyGuide(data) {
            if (data.rows.length) {
               result.defaultStudyGuideId = _.first(data.rows).key[1];
            }
            return result;
         })
         .catch(function onErr(err) {
            throw err;
         });
   }

   function getStudyGuideInfo(userId, id) {
      var result = new EmptyResult(id);

      return q.ninvoke(db, 'get', id)
         .spread(function getStudyGuidePublicationSummary(data) {
            result.studyGuide = new PublicationSummary(data);
            result.tableOfContents = data.toc; //?
            return q.ninvoke(db, 'get', data.bookId);
         })
         .spread(function getBookPublicationSummary(data) {
            result.book = new PublicationSummary(data);
            return userPublication.getPublicationById(userId, result.book.id);
         })
         .then(function getUserPublicationSummary(data) {
            result.book.userPublication = new UserPublicationSummary(data);
            if (data && _.has(data, 'currentStudyGuideId')) {
               result.currentStudyGuideId = data.currentStudyGuideId;
            }
            return q.ninvoke(db, 'view', 'Views', 'publicationsRelated', {
               startkey : [result.book.id],
               endkey   : [result.book.id, {}],
               include_docs : true
            });
         })
         .spread(function getRelatedStudyGuides(data) {
            result.relatedStudyGuides = data.rows
               .map(function (row) {
                  return new PublicationSummary(row.doc);
               });
            return q.ninvoke(db, 'view', 'Views', 'defaultStudyGuideByBookId', {
               startkey : [result.book.id],
               endkey : [result.book.id, {}]
            });
         })
         .spread(function getDefaultStudyGuide(data) {
            if (data.rows.length) {
               result.defaultStudyGuideId = _.first(data.rows).key[1];
            }
            return result;
         })
         .catch(function onErr(err) {
            throw err;
         });
   }

   function getCollectionInfo(userId, id) {
      var result = {
         id : id
      };
      return q.ninvoke(db, 'get', id)
         .spread(function getCollectionSummary(data) {
            result.collection = new PublicationSummary(data);
            return q.ninvoke(db, 'view', 'Views', 'publicationsCollections', {
               startkey : [id],
               endkey   : [id, {}],
               include_docs : true
            });
         })
         .spread(function extendCollectionSummary(data) {
            result.books = [];
            data.rows.forEach(function (row) {
               if (row.doc) {
                  result.books.push(new PublicationSummary(row.doc));
               }
            });
            _.extend(result.collection, result.books.reduce(function (r, item) {
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
            result.collection.difficulty /= result.collection.booksNumber;
            return result;
         })
         .catch(function onErr(err) {
            throw err;
         });
   }

   function getStudyCourseInfo(userId, id) {
      return require('./studyCourses.js').getStudyCourse(id, false)
         .then(function getStudyCourseSummary(data) {
            var result = new PublicationSummary(data);
            result.items = data.studyCourseItems;
            return result;
         })
         .catch(function onErr(err) {
            throw err;
         });
   }

   function PublicationSummary(rawData) {
      this.id                 = rawData._id;
      this.publicationType    = rawData.type;
      this.name               = rawData.name;
      this.author             = rawData.author;
      this.description        = rawData.description || '';
      this.cover              = rawData.cover;
      this.category           = rawData.category;
      this.audio              = Boolean(rawData.audio);
      this.wordsNumber        = rawData.wordsCount || 0;
      this.paragraphsNumber   = rawData.paraCount  || 0;
      this.difficulty         = rawData.difficulty || 0;
      this.mediaSize          = rawData.mediaSize  || 0; //?
      this.language           = rawData.language;
      this.wordsPerMinute     = rawData.wordsPerMinute || 0; //?
      this.bitRate            = rawData.bitRate    || 0; //?
      if (rawData.exercises) {
         this.readingTime     = rawData.readingTime +
            utils.calculateReadingTime(rawData.exercises);
      }
      if (rawData.version) {
         this.version         = rawData.version;
      }
      // this.lastTouchedAt = lastTouchedAt: DateTime
      // this.userPublication = userPublication: UserPublicationSummary
   }

   function UserPublicationSummary(rawData) {
      rawData              = rawData || {};
      this.favorite        = Boolean(rawData.personal);
      this.lastTouchedAt   = rawData.lastTouchedAt    || 0;
      this.readingDuration = rawData.readingDuration  || 0;
      this.readingProgress = rawData.readingProgress  || 0;
      this.completed       = Boolean(rawData.completed);
   }

   function EmptyResult(id) {
      this.id                    = id;
      this.book                  = null;
      this.tableOfContents       = null;
      this.relatedStudyGuides    = [];
      this.defaultStudyGuideId   = '';
      this.currentStudyGuideId   = '' ;
   }

   function filterByCriteria(item, criteria) {
      var name = unidecode((item.name || '').toLowerCase());
      var author = unidecode((item.author || '').toLowerCase());

      return ((name && name.indexOf(criteria) > -1) || (author && author.indexOf(criteria) > -1));
   }

   var persistDefaultStudyGuide = function (_userId, _bookId, _defaultStudyGuideId) {
      _defaultStudyGuideId = _defaultStudyGuideId && _defaultStudyGuideId.replace(/\s+/, "");

      if ( !_bookId ) {
         return _userId; //temp
      }

      var queryParams = {
         include_docs : true,
         startkey    : [_bookId],
         endkey      : [_bookId, {}]
      };

      return _db.view('defaultStudyGuideByBookId', queryParams)
          .spread(function onDefaultStudyGuideInfoGet (_response) {
             var response = _response.rows;
             if ( !_defaultStudyGuideId ) {
                var docs = _.map(response, function (_item) {
                   return {
                      _id     : _item.doc._id,
                      _rev    : _item.doc._rev,
                      _deleted : true
                   };
                });
                return _db.bulk({ docs : docs });
             }
             if ( !response.length ) {
                return _db.insert({
                   type                : 'CustomizedBook',
                   bookId              : _bookId,
                   defaultStudyGuideId : _defaultStudyGuideId
                });
             }
             return _db.insert({
                _id                 : response[0].doc._id,
                _rev                : response[0].doc._rev,
                type                : 'CustomizedBook',
                bookId              : _bookId,
                defaultStudyGuideId : _defaultStudyGuideId
             });
          })
          .then(_onSuccess)
          .catch(_onError);
   };

   var persistCurrentStudyGuide = function (_userId, _bookId, _currentStudyGuideId) {
      _currentStudyGuideId = _currentStudyGuideId && _currentStudyGuideId.replace(/\s+/, "");

      if ( !_bookId || !_currentStudyGuideId ) {
         return _userId; //temp
      }

      return userPublication.updateUserPublication(_userId, {
         publicationId       : _bookId,
         currentStudyGuideId : _currentStudyGuideId
      });
   };

   //helpers
   function _onError (err) {
      var errMsg = err.description || err;
      return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
   }

   function _onSuccess (response) {
      return response.id || response[0].id || response[1]['status-code'];
   }

   module.exports = {
      set: savePublication,
      setAll: saveAllPublication,
      get: getPublication,
      getAll: getAllPublication,
      updateAll: updateAllPublication,
      deletePublication: deletePublication,
      searchPublications: searchPublications,
      GetPublicationDetails: getPublicationDetails,
      searchStudyGuideByCriteria: searchStudyGuideByCriteria,
      getCompactDetails: getCompactDetails,
      createStudyGuide: createStudyGuide,
      update: updatePublication,
      persistPublication: persistPublication,
      getLibraryParameters: getLibraryParameters,
      getRelatedPublications: getRelatedPublications,
      getRelatedPublicationsForStudyGuide: getRelatedPublicationsForStudyGuide,
      persistExercises: persistExercises,

      getBookInfo : getBookInfo,
      getStudyGuideInfo : getStudyGuideInfo,
      getCollectionInfo : getCollectionInfo,
      getStudyCourseInfo : getStudyCourseInfo,
      persistDefaultStudyGuide : persistDefaultStudyGuide,
      persistCurrentStudyGuide : persistCurrentStudyGuide
   };
})();
