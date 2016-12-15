/*jslint node: true */
/*jslint camelcase: false */
(function () {
   "use strict";
   var q       = require('q');
   var yaml    = require('js-yaml');
   var uuid    = require('node-uuid');
   var _       = require('underscore');
   var crypto  = require('crypto');

   var essayTask = require('./manageEssayTask.js');
   var manageTests = require('./manageTests.js');
   var publication = require('./publication.js');
   var db       = require('./dao/utils').findDB();
   // var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);
   var utils = require('../utils/utils.js');
   var config = require(__dirname + '/../utils/configReader.js');
   var emptyMaterialsDoc = {
      annotations : [],
      bookmarks : [],
      comments : [],
      categories : [],
      discussionTasks   : [],
      paraSize: '',
      type              : 'Material'
   };
   var testsField = 'tests';
   var essayField = 'essays';
   var materialsPattern = _.keys(_.omit(emptyMaterialsDoc, 'type'));
   var publicationPattern =
      ['_id', 'name', 'author', 'description', 'category', 'cover'];
   var essayPattern = ['locator', 'topic', 'wordsLimit', 'comment'];

   var fetch = function (viewName, key) {
      return q.ninvoke(db, 'view', 'Views', viewName, {
         key : key,
         reduce : false,
         include_docs : true
      })
      .spread(function onViewMaterials(body) {
         return body.rows.length ? body.rows[0].doc : emptyMaterialsDoc;
      })
      .catch(function (err) {
         return q.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         });
   };

   var generateResponse = function (materials, studyGuideMaterials) {
      var response = _.pick(materials, _.keys(emptyMaterialsDoc));

      if (studyGuideMaterials) {
         _.keys(response).forEach(function (material) {
            if (studyGuideMaterials[material]) {
               response[material] = response[material].concat(studyGuideMaterials[material]);
            }
         });
      }
      return response;
   };

   var fetchMaterials = function (userId, requestQuery) {
      var bookId     = requestQuery.bookId;
      var editor     = requestQuery.editor === 'true';
      var result     = {};
      var viewName   = editor ? 'materialsStudyGuides' : 'materialsUserMaterials';

      return fetch(viewName, [userId, bookId])
      .then(function onFetchedMaterials(fetchedMaterials){
         result = fetchedMaterials;
         return publication.getCompactDetails([bookId], 'type');
      })
      .then(function onGetPublictionType(publications) {
         if (publications[bookId].type === 'StudyGuide' && !editor) {
            return fetch('materialsForStudyGuide', bookId)
               .then(function onGetMaterials(stgMaterials) {
                  return generateResponse(result, stgMaterials);
               });
         }
         else {
            return generateResponse(result);
         }
      })
      .catch(function(err) {
         throw err;
      });
   };

   var getExercises = function (requestQuery) {
      var deferred = q.defer();
      var result = [];
      var dbQueryParams = {
         startkey : [requestQuery.bookId],
         endkey   : [requestQuery.bookId, {}],
         include_docs : true
      };
      db.view('Views', 'exercisesList', dbQueryParams, function (err, body){
            if (err) {
               deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
            }
            else {
               if (body.rows.length) {
                  body.rows.forEach(function(el){
                     result.push(el.doc);
                  });
               }
               deferred.resolve(result);
            }
      });
      return deferred.promise;
   };

   var persistMaterials = function (userId, requestBody) {
      var bookId     = requestBody.bookId;
      var materials  = requestBody.materials;
      var editor     = requestBody.editor;
      var materialsDoc     = _.clone(emptyMaterialsDoc);
      var createCriteria   = false;
      var action = 'add';
      var exercise = materials;
      var responseBookId;
      materialsDoc.bookId  = bookId;
      materialsDoc.userIds = [userId];

         if (editor) {
         return fetch('materialsStudyGuides', [userId, bookId])
            .then(function onMaterialsById(fetchedMaterials) {
                  if (!fetchedMaterials._id) {
                     materialsDoc.bookId = generateNewId();
                     materialsDoc.editor = true;
                     createCriteria = true;
                  }
                  else {
                     materialsDoc.paraSize = materialsDoc.paraSize - fetchedMaterials.paraSize;
                     _.extend(materialsDoc, fetchedMaterials);
                  }
               if (materialsDoc.userIds.indexOf(userId) === -1) {
                  materialsDoc.userIds.push(userId);
               }
                  _.extend(materialsDoc, materials);
               return db.insert(materialsDoc);
            })
            .then(function() {
               if (createCriteria) {
                  return publication.createStudyGuide(materialsDoc.bookId, bookId, userId);
               }
               else {
                  return materialsDoc.bookId;
               }
            })
            .then(function(bookId) {
               responseBookId = bookId;
               exercise.publicationId = bookId;
               exercise.testType = _.has(exercise, 'discussionTasks') ? 'discussion task' : 'microJournaling';
               return publication.persistExercises(exercise, action);
            })
            .then(function() {
               return responseBookId;
            })
            .catch(function(err) {
               throw err;
            });
         }
         else {
         return fetch('materialsUserMaterials', [userId, bookId])
            .then(function onMaterialsByBook(fetchedMaterials) {
                  _.extend(materialsDoc, fetchedMaterials, materials);
               return db.insert(materialsDoc);
            })
            .then(function onInsertMaterials() {
               return bookId;
            })
            .catch(function(err) {
               throw err;
            });
         }
   };

   var generateNewId = function () {
      return crypto.randomBytes(16).toString('hex');
   };
   /* jshint unused:false */
   var _export = function (userId, requestQuery) {
      var id         = requestQuery.id;
      var format     = requestQuery.format;
      var response   = {};

      return publication.get(id)
      .then(function onExportPublication(publicationInfo) {
         if (publicationInfo.type !== 'StudyGuide') {
            return {};
         }
         else {
            _.extend(response, _.pick(publicationInfo, publicationPattern));
            return fetch('materialsForStudyGuideAll', id);
         }
      })
      .then(function onExportMaterials(materials) {
         _.extend(response, _.pick(materials, materialsPattern));
         return manageTests.exportTests(id);
      })
      .then(function onExportTests(tests) {
         response[testsField] = tests;
         return essayTask.getEssayTasksList({publicationId : id});
      })
      .then(function onExportEssayTasks(essays) {
         response[essayField] = _.map(essays, function(essay) {
            return _.pick(essay, essayPattern);
         });
         return format === 'yaml' ? yaml.dump(response) : response;
      });
   };
   /* jshint unused:true */
   var _import = function (userId, requestBody) {
      var _id        = requestBody.id;
      var rawData    = requestBody.data;
      var format     = requestBody.format;
      var parsedData       = {};
      var publicationInfo  = {};
      var materials, tests, essays;

      try {
         if (format === 'yaml') {
            parsedData = yaml.safeLoad(rawData);
         }
         else {
            parsedData = JSON.parse(rawData);
         }
      }
      catch (_) {
         parsedData = false;
      }
      if (typeof parsedData !== 'object' || !_.keys(parsedData).length) {
         return q.reject(utils.addSeverityResponse(format + ' parse error', config.businessFunctionStatus.error));
      }
      materials = _.pick(parsedData, materialsPattern);
      delete materials.type;
      publicationInfo = _.pick(parsedData, publicationPattern);
      tests  = parsedData[testsField] || [];
      essays = parsedData[essayField] || [];

      return fetch('materialsStudyGuides', [userId, _id])
         .then(function onImportMaterials(fetchedMaterials) {
            _.keys(fetchedMaterials).forEach(function (m) {
               if (materials[m] && Array.isArray(materials[m])) {
                  materials[m] = materials[m].concat(fetchedMaterials[m]);
               }
            });
            return persistMaterials(userId, {
               materials : materials,
               editor : true,
               bookId : _id
            });
         })
         .then(function onUpdatePublication(id) {
            publicationInfo._id = id;
            delete publicationInfo.cover;
            return publication.update(publicationInfo);
         })
         .then(function onImportTests() {
            return _queueOfPromises(publicationInfo._id, tests, manageTests.persistTest);
         })
         .then(function onImportEssayTasks() {
            return _queueOfPromises(publicationInfo._id, essays, essayTask.persistEssayTask);
         })
         .then(function () {
            return publicationInfo._id;
         })
         .catch(function _onError (err) {
           var errMsg = err.description || err;
           return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
         });
   };

   function _queueOfPromises (publicationId, collection, callback) {
      return collection
         .map(function (item) {
            item.publicationId = publicationId;
            item._id = uuid.v1();
            return item;
         })
         .reduce(function (promise, item) {
            return promise.then(function () {
               return callback(item);
            });
         }, q());
   }


   module.exports = {
      getExercises : getExercises,
      fetch : fetchMaterials,
      update : persistMaterials,
      export : _export,
      import : _import
   };
})();