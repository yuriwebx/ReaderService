/*jslint bitwise: true */
/* global Uint8Array: false */
define([
   'module',
   'swServiceFactory',
   'jquery',
   'underscore',
   'publication/locator',
   'utils/search',
], function (module, swServiceFactory, $, _, Locator, search) {
   'use strict';
   swServiceFactory.create({
      module : module,
      service : ['$q',
         '$timeout',
         'swRestService',
         'swApplicationToolbarService',
         'swUserStudyService',
         'swNotificationService',
         'swPublicationsService',
         'swAgentService',
         'swUnifiedSettingsService',
         'swDownloadManager',
         function ($q,
            $timeout,
            swRestService,
            swApplicationToolbarService,
            swUserStudyService,
            swNotificationService,
            swPublicationsService,
            swAgentService,
            swUnifiedSettingsService,
            swDownloadManager) {

            var Utils = (function() {

               var sectionOffset = 0;

               function parseId(id) {
                  var parseIdRegExp = /\d+/;
                  var matchingResult = id.match(parseIdRegExp);
                  var _id = 0;

                  if (matchingResult) {
                     _id = matchingResult[0] - 1;
                  }
                  return _id;
               }

               function compareParagraphIds(aStr, bStr) {
                  // natcompare
                  var trimmingLeadingZeroesPattern = /(\D|^)0+(?=\d)/g;
                  aStr = aStr.replace(trimmingLeadingZeroesPattern, '$1');
                  bStr = bStr.replace(trimmingLeadingZeroesPattern, '$1');

                  var aPat = /(\d+)|(\D+)/g;
                  var bPat = new RegExp(aPat.source, 'g');
                  var aGroup, bGroup, cmp;
                  while ((aGroup = aPat.exec(aStr)) !== null) {
                     bGroup = bPat.exec(bStr);
                     if (bGroup === null) {
                        return -1;
                     }

                     cmp = aGroup[0] - bGroup[0];
                     if (cmp === cmp) {
                       if (cmp !== 0) {
                         return cmp < 0 ? -1 : 1;
                       }
                     }
                     else {
                       cmp = aGroup[0].localeCompare(bGroup[0]);
                       if (cmp !== 0) {
                         return cmp;
                       }
                     }
                  }
                  return bPat.exec(bStr) === null ? 0 : 1;
               }

               function compareLocators(aLoc, bLoc) {
                  return compareParagraphIds(aLoc.id, bLoc.id)  ||  aLoc.offset - bLoc.offset;
               }

               function comparePositions(aPos, bPos) {
                  if (aPos === bPos || aPos === 'aside') {
                     return 0;
                  }
                  else if ((aPos === 'B') || (bPos === 'A' || bPos === 'aside')) {
                     return 1;
                  }
                  return 0;
               }

               function universalNotesComparator(noteA, noteB) {
                  var comparisonRes = 0;
                  var a = getItemParaId(noteA);
                  var b = getItemParaId(noteB);
                  if (noteA.start && noteB.start) {
                     comparisonRes = compareLocators(noteA.start, noteB.start);
                     comparisonRes = comparisonRes || compareLocators(noteA.end, noteB.end);
                  }
                  else {
                     comparisonRes = compareParagraphIds(a, b) || comparePositions(noteA.position, noteB.position);
                  }
                  if (!comparisonRes) {
                     comparisonRes = noteA.createdAt - noteB.createdAt;
                  }
                  return comparisonRes;
               }

               function encodeHex(str) {
                  return str.replace(/./g, function (r, i) {
                     return (i ? '-' : '') + r.charCodeAt(0).toString(16);
                  });
               }

               function findIndexToAdd(collection, item) {
                  for (var i = 0, l = collection.length; i < l; i++) {
                     if (universalNotesComparator(collection[i], item) > 0) {
                        break;
                     }
                  }
                  return i;
               }

               function getItemParaId(item) {
                  return item.start ? item.start.id : item.paragraphId ? item.paragraphId : (item.locator && item.locator.paragraphId) ? item.locator.paragraphId : (item.locator || '');
               }

               function clone (object) {
                  return JSON.parse(JSON.stringify(object));
               }

               function getParagraphIds (item) {
                  var ids = [];
                  if (item.start && item.end) {
                     ids = _.range(parseId(item.start.id), parseId(item.end.id) + 1);
                  }
                  else {
                     ids = [parseId(getItemParaId(item))];
                  }

                  return _.map(ids, function(id) {
                     return id - sectionOffset;
                  });
               }

               function handleCollectionEvent (eventName, collection, item) {
                  var _handle = {
                     add : function() {
                        collection.splice(findIndexToAdd(collection, item), 0, item);
                     },
                     update : function() {
                        var index  = findIndex(item);
                        if (index > -1) {
                           _.extend(collection[index], item);
                        }
                        else {
                           this.add();
                        }
                     },
                     remove : function() {
                        collection.splice(findIndex(item), 1);
                     }
                  };

                  function findIndex(item) {
                     return  _.findIndex(collection, function(m) {
                        var indexProp = item.id ? 'id' : '_id';
                        return item[indexProp] === m[indexProp];
                     });
                  }

                  _handle[eventName]();
               }

               function getSectionOffset() {
                  return sectionOffset;
               }

               function setSectionOffset(offset) {
                  sectionOffset = offset;
               }

               function utf8ArrayToStr (array) {
                  // http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
                  var out = '', i = 0, len = array.length, c;
                  var char2, char3;
                  while (i < len) {
                     c = array[i++];
                     switch (c >> 4) {
                     case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                        // 0xxxxxxx
                        out += String.fromCharCode(c);
                        break;
                     case 12: case 13:
                        // 110x xxxx   10xx xxxx
                        char2 = array[i++];
                        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                        break;
                     case 14:
                        // 1110 xxxx  10xx xxxx  10xx xxxx
                        char2 = array[i++];
                        char3 = array[i++];
                        out += String.fromCharCode(((c & 0x0F) << 12) |
                           ((char2 & 0x3F) << 6) |
                           ((char3 & 0x3F) << 0));
                        break;
                     }
                  }
                  return out;
               }

               function getContentString (index, content, isSliceSupported) {
                  var chunk,
                      endIndex = index.start + index.offset;
                  chunk = isSliceSupported ? content.slice(index.start, endIndex) : new Uint8Array(_.slice(content, index.start, endIndex));
                  return utf8ArrayToStr(chunk);
               }

               return {
                  parseId           : parseId,
                  clone             : clone,
                  encodeHex         : encodeHex,
                  getItemParaId     : getItemParaId,
                  getParagraphIds   : getParagraphIds,
                  getSectionOffset  : getSectionOffset,
                  setSectionOffset  : setSectionOffset,
                  getContentString  : getContentString,
                  handleCollectionEvent : handleCollectionEvent,
                  universalNotesComparator : universalNotesComparator
               };

            })();

            var exerciseProperties = [
               '_id', 'comment', 'completed', 'completedAt', 'createdAt', 'locator',
               'startedAt', 'text', 'topic', 'type', 'wordsLimit', 'wordsNumber',
               'testType', 'name', 'description', 'status', 'active',
               'correctAnswersCount', 'testQuestionsCount', 'modifiedAt', 'author', 'userRole',
               'bookId', 'messages', 'authorId'
            ];

            var noteProperties = [
               'id', 'category', 'start', 'end', 'paragraphId', 'note',
               'position', 'createdAt', 'modifiedAt', 'locator', 'studyGuide'
            ];

            var currentPublication = { id : null, length : -1 };
            var content    = [];
            var indexMap   = {};
            var audio      = {
               offsets  : [],
               locators : [],
               diff     : []
            };
            var categories = [];
            var exercises  = [];
            var discussions = [];
            var details    = {};
            var rawMaterials  = {
               annotations     : [],
               bookmarks       : [],
               comments        : [],
               essayTask       : [],
               test            : [],
               discussionTasks : [],
               classDiscussions : []
            };
            var microJParaSize   = '';
            var extrasMaterials  = extendForExtras(rawMaterials);
            var contentMaterials = indexByLocator(rawMaterials);
            var userMaterials    = {};
            var defaultAudioSpeed = 140;

            var notesChangeListeners         = [];
            var exercisesChangeListeners     = [];
            var discussionsChangeListeners   = [];
            var publicationDetailsListeners  = [];
            var publicationLoadListener      = [];

         /* Init */

            this.init = function(id, readRange, classId) {
               if (!id) {
                  return $q.reject(new Error('No id'));
               }
               if (id === currentPublication.id) {
                  return $q.when(id);
               }
               var isEditor = swApplicationToolbarService.isEditor();
               var self = this;

               return swPublicationsService.initPublicationPresentation(id, classId, isEditor)
                  .then(function (response) {
                     var start = 0, stop;
                     var prevWordsCount = 0;
                     var summary = {
                        paragraphsMap  : {},
                        paragraphs     : [],
                        position       : 0
                     };
                     var isSliceSupported = !_.isUndefined(response.content.slice);
                     /* details.book.wordsNumber is incorrect in large books
                        remove block below after fix it
                     */
                     var lastIndex     = _.last(Object.keys(response.index));
                     var $lastElement  = $(Utils.getContentString(response.index[lastIndex], response.content, isSliceSupported));
                     var totalWords    = ($lastElement.data('before') - 0) + ($lastElement.data('words-count') - 0);
                     /**/
                     if (readRange) {
                        start = response.index[readRange[0]].index;
                        stop  = response.index[readRange[1]].index;
                     }
                     _.each(response.index, function parseContent (current, _id) {
                        var $element, name, chapter, wordsCount, index;
                        var wordsBefore, text, isChapter;

                        if (readRange && (start > current.index || stop < current.index)) {
                           return;
                        }
                        index = current.index - start;
                        content[index] = Utils.getContentString(current, response.content, isSliceSupported);
                        indexMap[_id] = index; //global
                        $element = $(content[index]);
                        if ($element.html() === '') { // filtering out the empty blocks
                           return; // TODO: log the cases where some elements were actually filled out
                        }
                        name          = $element.data('id') || '';
                        chapter       = $element.data('chapter');
                        wordsCount    = +$element.data('words-count');
                        wordsBefore   = +$element.data('before');
                        text          = $element.text().trim().slice(0, 150);
                        isChapter     = Boolean(chapter) && (summary.prevChapter !== chapter);
                        if (isChapter) {
                           name = summary.chapterName = text;
                           summary.prevChapter = chapter;
                        }
                        else if (summary.chapterName) {
                           name += ' ' + summary.chapterName;
                        }
                        else {
                           name = text;
                        }
                        summary.paragraphs.push({
                           id : _id,
                           name : name,
                           words : prevWordsCount,
                           position : summary.position,
                           isChapter : isChapter,
                           readingRemainingTime : Math.floor((totalWords - wordsBefore - wordsCount) / 140 * 60000)
                        });
                        summary.paragraphsMap[_id] = summary.paragraphs.length - 1;
                        summary.position += Math.floor(((prevWordsCount * 100) / totalWords) * 1000) / 1000;
                        prevWordsCount = wordsCount;
                     });
                     setContentProviderState(id, response, classId);
                     summary = _.omit(summary, ['prevChapter', 'chapterName', 'position']);
                     if (readRange) {
                        rawMaterials = filterMaterialsByRange(rawMaterials, start, stop);
                        Utils.setSectionOffset(start);
                        details.wordsCount = totalWords;
                     }
                     contentMaterials  = indexByLocator(Utils.clone(rawMaterials));
                     extrasMaterials   = extendForExtras(Utils.clone(rawMaterials));
                     userMaterials     = swUserStudyService.getUserStudyMaterials();
                     exercises   = rawMaterials.essayTask
                        .concat(rawMaterials.test)
                        .concat(rawMaterials.discussionTasks)
                        .sort(Utils.universalNotesComparator);
                     discussions = rawMaterials.classDiscussions.sort(Utils.universalNotesComparator);
                     extendExercises();

                     self.onMicroJParaSizeChange(microJParaSize);
                     swUnifiedSettingsService.setSetting('ScrollSettings', 'audioSpeed', details.book.wordsPerMinute || defaultAudioSpeed);
                     if (classId && _.has(rawMaterials, 'classDiscussions')) {
                       swNotificationService.addNotificationListener('discussions', function () {
                          return {
                             classId : classId,
                             bookId : id
                          };
                       }, function (response) {
                           _.each(response, function (discussion) {
                              updateContentMaterials('classDiscussions', discussion, 'update');
                           });
                           $timeout(); //deferred $scope.$apply()
                        });
                     }
                     _.extend(summary, parseTableOfContents(details.tableOfContents, lastIndex, readRange));
                     onPublicationLoad(summary, details);
                     return id;
                  });
            };

            function setContentProviderState (id, response, classId) {
               currentPublication.id = id;
               currentPublication.length = content.length;
               details = response.details;
               audio = response.audio || audio;
               microJParaSize = response.materials.paraSize;
               categories = response.materials.categories;
               details.classId = classId;
               _.extend(rawMaterials, _.omit(response.materials, 'categories', 'paraSize'));
            }

            function parseTableOfContents (toc, lastElementId, readRange) {
               var tocData = [];
               var tocRanges = [];
               _.each(toc, function(chapter, index) {
                  var nextPara = toc[index + 1] || {};
                  var nextId = nextPara.id || lastElementId;
                  var startPara = Utils.parseId(chapter.id);
                  var endPara = Utils.parseId(nextId);
                  var start = 0;
                  var end = Infinity;
                  if (readRange) {
                     start = Utils.parseId(readRange[0]);
                     end = Utils.parseId(readRange[1]);
                  }
                  if ((startPara < start && endPara < start) || (startPara > end && endPara > end)) {
                     return;
                  }

                  tocRanges.push([startPara, endPara]);
                  tocData.push({
                     text: chapter.text.trim().slice(0, 150)
                  });
               });
               tocRanges.sort(function (a, b) {
                  return a[0] - b[0];
               });
               return {
                  tocData : tocData,
                  tocRanges : tocRanges
               };
            }

            function onPublicationLoad (_contentSummary, _details) {
               notifyOnPublicationLoadListener(_contentSummary, _details);
               notifyNotesListeners();
               notifyExercisesListeners();
               notifyDiscussionsListeners();
               notifyPublicationDetailsListeners();
            }

            this.addOnPublicationLoadListener = function (listener) {
               publicationLoadListener = _.union(publicationLoadListener, [listener]);
            };

            this.removeOnPublicationLoadListener = function (listener) {
               _.pull(publicationLoadListener, listener);
            };

            function notifyOnPublicationLoadListener () {
               var args = [].slice.call(arguments);
               _.each(publicationLoadListener, _.method('apply', null, args));
            }

            this.destroy = function() {
               currentPublication  = { id : null, length : -1 };
               content     = [];
               indexMap    = {};
               categories  = [];
               exercises   = [];
               discussions = [];
               details     = {};
               microJParaSize    = '';
               rawMaterials      = {
                  annotations     : [],
                  bookmarks       : [],
                  comments        : [],
                  essayTask       : [],
                  test            : [],
                  discussionTasks : [],
                  classDiscussions: []
               };
               extrasMaterials   = {};
               contentMaterials  = {};
               userMaterials     = {};
               notesChangeListeners = [];
               exercisesChangeListeners = [];
               discussionsChangeListeners = [];
               publicationDetailsListeners = [];
               this.onMicroJParaSizeChange = _.noop;
               Utils.setSectionOffset(0);

               swNotificationService.removeNotificationListener('discussions');
            };

            /* Content */

            this.fetchBefore  = function (id, count) {
               var index = indexMap[id];
               var start = Math.max(index - count, 0);
               var stop  = index;

               if (index === 0) {
                  return null;
               }
               return fetchBlocks(start, stop);
            };

            this.fetchAfter = function (id, count) {
               var index = indexMap[id] + 1;
               var start = index;
               var stop  = start + count;

               if (index === currentPublication.length) {
                  return null;
               }
               return fetchBlocks(start, stop);
            };

            this.fetchInitialBlocks = function (id) {
               return fetchAround(id, 3);
            };

            var fetchAround = function(id, count) {
               var index = indexMap[id] || 0;
               var start = 0;
               var stop  = currentPublication.length;

               if (count < stop) {
                  // minding the edge cases
                  start = Math.max(index - (count - 1 >>> 1) - Math.max(0, index + 1 + (count >>> 1) - stop), 0);
                  stop = start + count;
               }

               return fetchBlocks(start, stop);
            };

            var fetchBlocks = function(start, stop) {
               function createBlock(html) {
                  var id = _.findKey(indexMap, function (index) {
                     return index === start;
                  });
                  var block = {
                     id : id,
                     html : html
                  };
                  if (contentMaterials[start]) {
                     block.materials = contentMaterials[start];
                  }
                  if (!start) {
                     block.first = true;
                  }
                  if (start === (content.length - 1)) {
                     block.last = true;
                  }
                  if (userMaterials[id]) {
                     block.materials = block.materials || {};
                     extendByUserMaterials(block.materials, id);
                  }
                  start++;
                  return block;
               }

               return _.map(content.slice(start, stop), createBlock);
            };

            /* */

            this.getDetails = function () {
               return details.book;
            };

            this.getLanguage = function () {
               var language = 'en';
               if (_.has(details, 'book') && details.book.language) {
                  language = details.book.language;
               }
               return language;
            };

            /* MicroJ */

            this.getMicroJParaSize = function () {
               return microJParaSize;
            };

            this.setMicroJParaSize = function (size) {
               microJParaSize = size;
            };

            this.onMicroJParaSizeChange = _.noop;

            /* Categories */

            this.getCategories = function() {
               return categories;
            };

            this.getCategoriesObject = function() {
               function createObject(categoriesObject, category) {
                  categoriesObject[category.name] = category.color;
                  return categoriesObject;
               }

               return _.reduce(categories, createObject, {});
            };

            this.addCustomCategory = function() {
               function notPreset(category) {
                  return !category.preset;
               }

               return persistMaterials('categories', _.filter(categories, notPreset));
            };

            this.removeCustomCategory = function(category) {
               var deferred = $q.defer();
               function removeCustom(_category) {
                  return _category.name !== category.name;
               }

               categories = _.filter(categories, removeCustom);
               this.addCustomCategory().then(_.noop).catch(_.noop);
               deferred.resolve(categories);

               return deferred.promise;
            };

            /* Create Study Guide */

            this.createStudyGuide = function(publication) {
               var params = getRequestParams();
               params.bookId     = publication.id;
               params.materials  = {};

               return swRestService.restRequest('post', 'Materials', 'update', params);
            };

            /* Exercises */

            this.onExercisesChange = function(exercise, materialTypeArr) {
               var index = _.findIndex(materialTypeArr, function (_exercise) {
                  return exercise._id === _exercise._id;
               });
               if (index < 0 ) {
                  materialTypeArr.push(exercise);
               }
               else {
                  if (exercise.remove) {
                     materialTypeArr.splice(index, 1);
                  }
                  else {
                     _.extend(materialTypeArr[index], exercise);
                  }
               }
               materialTypeArr.sort(Utils.universalNotesComparator);
               notifyDiscussionsListeners();
               notifyExercisesListeners();
            };

            this.getExercise = function (exerciseId) {
               return _.findWhere(exercises, {_id : exerciseId});
            };

            /* Register & Notification */

            this.onMaterialsChange = function (materialType, material, eventName) {
               var isEditor = swApplicationToolbarService.isEditor();
               var onExercisesChange = this.onExercisesChange.bind(this);
               var _materialType = _.camelCase(materialType);

               function individualItemChange(materialItem) {
                  if (['essayTask', 'microJournalling', 'test'].indexOf(_materialType) > -1) {
                     materialItem = _.pick(materialItem, exerciseProperties);
                     updateUserMaterials(materialItem, _materialType, eventName);
                     onExercisesChange(materialItem, exercises);
                  }
                  else {
                     if (!isEditor && materialItem.studyGuide) {
                        return false;
                     }
                     materialItem.studyGuide = isEditor;
                     if (_materialType === 'discussionTasks') {
                        materialItem = _.pick(materialItem, exerciseProperties);
                        materialItem.type = 'discussion task';
                     }
                     else if (_materialType === 'classDiscussions') {
                        materialItem = _.pick(materialItem, exerciseProperties);
                     }
                     else {
                        materialItem = _.pick(materialItem, noteProperties);
                     }
                     updateRawMaterials(_materialType, materialItem, eventName);
                     if (_materialType !== 'discussionTasks' && _materialType !== 'classDiscussions') {
                        updateExtrasMaterials(Utils.clone(materialItem), eventName);
                     }
                     else if ( _materialType === 'classDiscussions' ) {
                        onExercisesChange(materialItem, discussions);
                     }
                     else {
                        onExercisesChange(materialItem, exercises);
                     }
                     if (_materialType !== 'classDiscussions') {
                        persistMaterials(_materialType, rawMaterials[_materialType].filter(excludePreset))
                           .then(_.noop).catch(_.noop);
                     }
                  }
                  updateContentMaterials(_materialType, materialItem, eventName);
               }

               function excludePreset(item) {
                  return isEditor || !item.studyGuide;
               }

               if (_.isArray(material)) {
                  eventName = 'update';
                  material.forEach(individualItemChange);
               }
               else {
                  individualItemChange(material);
               }
               notifyNotesListeners();
            };

            /* Observe notes, comments, bookmarks for Notes extras tab */

            this.addOnNotesChangeListener = function(listener) {
               if (typeof listener === 'function') {
                  notesChangeListeners.push(listener);
                  listener(Utils.clone(extrasMaterials));
               }
            };

            this.removeOnNotesChangeListener = function(listener) {
               for (var i = 0; i < notesChangeListeners.length; ++i) {
                  if (notesChangeListeners[i] === listener) {
                     notesChangeListeners.splice(i, 1);
                     break;
                  }
               }
            };

            function notifyNotesListeners() {
               _.each(notesChangeListeners, function(listener) {
                  listener(Utils.clone(extrasMaterials));
               });
            }

            /* Observe essays, flashcards, quizzes for Exercises extras tab */

            this.addOnExercisesChangeListener = function(listener) {
               if (typeof listener === 'function') {
                  exercisesChangeListeners.push(listener);
                  listener(exercises);
               }
            };

            this.removeOnExercisesChangeListener = function(listener) {
               for (var i = 0; i < exercisesChangeListeners.length; ++i) {
                  if (exercisesChangeListeners[i] === listener) {
                     exercisesChangeListeners.splice(i, 1);
                     break;
                  }
               }
            };

            function notifyExercisesListeners() {
               _.each(exercisesChangeListeners, function(listener) {
                  listener(exercises);
               });
            }

            /* Discussions for Extras Tab */
            this.addOnDiscussionsChangeListener = function(listener) {
               if (typeof listener === 'function') {
                  discussionsChangeListeners.push(listener);
                  listener(discussions);
               }
            };

            this.removeOnDiscussionsChangeListener = function(listener) {
               for (var i = 0; i < discussionsChangeListeners.length; ++i) {
                  if (discussionsChangeListeners[i] === listener) {
                     discussionsChangeListeners.splice(i, 1);
                     break;
                  }
               }
            };

            function notifyDiscussionsListeners() {
               _.each(discussionsChangeListeners, function(listener) {
                  listener(discussions);
               });
            }

            /* Observe publication details for book info tab */

            this.addOnPublicationDetailsChangeListener = function(listener) {
               if (typeof listener === 'function')  {
                  publicationDetailsListeners.push(listener);
                  _notify(listener);
               }
            };

            this.removeOnPublicationDetailsChangeListener = function(listener) {
               for (var i = 0; i < publicationDetailsListeners.length; ++i) {
                  if (publicationDetailsListeners[i] === listener) {
                     publicationDetailsListeners.splice(i, 1);
                     break;
                  }
               }
            };

            function notifyPublicationDetailsListeners() {
               _.each(publicationDetailsListeners, _notify);
            }

            function _notify (listener) {
               if (!_.isEmpty(details)) {
                  if (_.has(details, 'studyGuide')) {
                     _.extend(details.studyGuide, {
                        notes : extrasMaterials.length,
                        exercises : exercises.length,
                        paragraphSummary : Boolean(microJParaSize)
                     });
                  }
                  listener(details);
               }
            }

            function persistMaterials(materialsType, materials) {
               var params        = getRequestParams();
               params.materials  = {};
               params.materials[materialsType] = materials;

               return swAgentService.request('post', 'Materials', 'update', params);
            }

            function getRequestParams() { //rework
               var isEditor   = swApplicationToolbarService.isEditor();
               var bookId     = isEditor ? details.id : details.book.id;

               return {
                  bookId     : bookId,
                  editor     : isEditor,
                  studyGuide : false,
                  classId    : details.classId
               };
            }

            this.updateMaterialsSet = function(materials, publication) {
               var deferred      = $q.defer();
               var params        = getRequestParams();
               params.materials  = materials;

               if (publication) {
                  params.bookId     = publication._id;
                  params.studyGuide = publication.type === 'StudyGuide';
               }

               swRestService.restRequest('post', 'Materials', 'update', params)
                  .then(function onMaterialsUpdate(response) {
                     deferred.resolve(response.data);
                  }, deferred.reject);

               return deferred.promise;
            };

            this.decorateExercises = function(exercises) { //?
              return _.groupBy(exercises.map(extendNote), 'chapter');
            };

            /* etc */

            function indexByLocator(rawMaterials) {
               var indexedMaterials    = {};
               _.each(_.keys(rawMaterials), function(type) { //each?
                  _.each(rawMaterials[type], function(item) {
                     _.each(Utils.getParagraphIds(item), function(paraId) {
                        addItem(type, item, paraId);
                     });
                  });
               });

               function addItem(type, item, paraId) {
                  indexedMaterials[paraId] = indexedMaterials[paraId] || {};
                  indexedMaterials[paraId][type] = indexedMaterials[paraId][type] || [];
                  indexedMaterials[paraId][type].push(item);
               }

               return indexedMaterials;
            }

            function extendForExtras(rawMaterials) {
               var extendedMaterials = [];

               if (content.length) {
                  extendedMaterials = _.map(rawMaterials.annotations
                     .concat(rawMaterials.bookmarks)
                     .concat(rawMaterials.comments), extendNote)
                     .sort(Utils.universalNotesComparator);
               }

               return extendedMaterials;
            }

            function extendNote(item) {
               var blockIds   = Utils.getParagraphIds(item);
               var elIndex    = blockIds[0];
               var $element   = $(content[elIndex]);
               var bmCategory = 'names';
               var defaultLen = 150;
               var start, end;

               extendItemByContentAttrs(item, $element, elIndex);
               if (item.type === 'Test' || item.type === 'EssayTask' || item.type === 'discussion task') {
                  return item;
               }
               item.type = item.start ? 'note' : item.position === 'aside' ? 'bookmark' : 'comment';
               if (item.start) {
                  start = item.start.offset;
                  end   = item.end.offset;
                  item.quote = getHighlightedQuote(blockIds, start, end, defaultLen, item.category);
               }
               else {
                  item.quote = getHighlightedQuote(blockIds, 0, defaultLen, defaultLen, item.category || bmCategory);
               }

               return item;
            }

            function extendItemByContentAttrs(item, element, index) {
               var defaultLen = 150;
               var chapterId  = element.attr('data-chapter');
               if (chapterId) {
                  chapterId = Utils.parseId(chapterId);
                  item.chapter = $(content[chapterId]).text().slice(0, defaultLen);
               }
               else {
                  item.chapter = element.text().slice(0, defaultLen);
               }
               if (element.is('blockquote')) {
                  item.paraId = $(content[Math.max(0, index - 1)]).attr('data-id');
               }
               else {
                  item.paraId = element.attr('data-id');
               }
            }

            function getHighlightedQuote(ids, start, end, maxLen, category) {
               var currId = ids[0];
               var lastId = ids[ids.length - 1];
               var currText, chunk = '', res = '';
               for (;currId <= lastId; currId++) {
                  currText = $(content[currId]).text().replace(/\n+\s+/g, '');
                  res += currText.slice(start, lastId - currId ? start + maxLen : end);
                  if (maxLen < res.length) {
                     break;
                  }
                  start = 0;
               }
               if (res.length < maxLen) {
                  chunk = currText.slice(end, end + (maxLen - res.length));
               }
               return highlight(res, category) + chunk;
            }

            function highlight(elementText, category) {
               var notaClass  = 'nota-annotation-cat-';
               var $el = $('<span>')
                  .text(elementText)
                  .addClass(notaClass + Utils.encodeHex(category));
               return $el[0].outerHTML;
            }

            function updateExtrasMaterials(materialItem, eventName) {
               if (eventName !== 'remove') {
                  extendNote(materialItem);
               }
               Utils.handleCollectionEvent(eventName, extrasMaterials, materialItem);
            }

            function updateRawMaterials(materialType, materialItem, eventName) {
               Utils.handleCollectionEvent(eventName, rawMaterials[materialType], materialItem);
            }

            function updateContentMaterials(materialType, materialItem, eventName) {
               _.each(Utils.getParagraphIds(materialItem), updateMaterials);

               function updateMaterials(paraId) {
                  contentMaterials[paraId] = contentMaterials[paraId] || {};
                  contentMaterials[paraId][materialType] = contentMaterials[paraId][materialType] || [];
                  Utils.handleCollectionEvent(eventName, contentMaterials[paraId][materialType], materialItem);
               }
            }

            function updateUserMaterials(materials, type) {
               var isEditor = swApplicationToolbarService.isEditor();
               var index, locator = materials.locator.paragraphId || materials.locator;
               if (isEditor || !locator || !type) {
                  return;
               }
               if (!userMaterials[locator]) {
                  userMaterials[locator] = {};
               }
               if (!userMaterials[locator][type]) {
                  userMaterials[locator][type] = [];
               }

               index = _.findIndex(userMaterials[locator][type], function (val) {
                  return val._id ? val._id === materials._id : val.locator.paragraphId === materials.locator.paragraphId;
               });
               if (index < 0) {
                  userMaterials[locator][type].push(materials);
               }
               else {
                  _.extend(userMaterials[locator][type][index], materials);
               }
               extendExercises();
               notifyExercisesListeners();
            }

            function filterMaterialsByRange(source, start, stop) {
               return _.mapValues(source, function(materials) {
                  return _.filter(materials, function(item) {
                     var id = Utils.parseId(Utils.getItemParaId(item));
                     return start <= id && id <= stop;
                  });
               });
            }

            function extendByUserMaterials(target, id) {
               _.extend(target, userMaterials[id], function(value, other) {
                  var result;
                  if (_.isUndefined(value) || !value.length) {
                     result = _.filter(other, function(item) { //filter out user data for removed tests
                        return !item._id;
                     });
                  }
                  else {
                     result = _.map(value, function(item) {
                        var userData = _.findWhere(other, {_id : item._id});
                        return userData ? _.extend(item, userData) : item;
                     });
                  }
                  return result;
               });
            }

            function extendExercises() {
               var userMaterialsList = getUserMaterialsList();
               if (userMaterialsList.length) {
                  _.each(exercises, function(item) {
                     _.extend(item, _.findWhere(userMaterialsList, {_id: item._id}));
                  });
               }
            }

            function getUserMaterialsList() {
               return _.reduce(_.values(userMaterials), function(res, materials) {
                  return [].concat.apply(res, _.values(materials));
               }, []);
            }

            /* Audio */

            this.hasAudio = function () { //Prevent playing audio in offline when audio hasn't been downloaded
               return details && details.book &&  details.book.audio;
            };

            this.getAudioSource = function() {
               var source = '';
               var id = _.get(details.book, 'id', '');
               if (id) {
                  source = swDownloadManager.get(id).audioSourcePath;
               }
               return source;
            };

            this.findByLocator = function (locator) { //USE FIRST TIME ELEMET NOT ARR
               var time = _find(audio.offsets, audio.locators, locator, function (a, b) {
                  return Locator.deserialize(a).startLocator.compareTo(b);
               });
               var diffIndex = search(audio.diff, time, function (a, b) { //improve this comparator
                  var _time = b[1] + a.shift;
                  if (a.start < _time && a.end > _time) {
                     return 0;
                  }
                  return a.end - _time;
               }, {forceLinear : true });
               return [time[0] + audio.diff[diffIndex.found ? diffIndex.index : diffIndex.index[1]].shift];
            };

            this.findByTime = function (time) {
               var next = 0, index = -1, shift = 0;
               var diffIndex = search(audio.diff, time, _diffTimeComparator, {forceLinear : true });

               if (diffIndex.found) { //ok
                  shift = audio.diff[diffIndex.index].shift;
                  index = _findIndex(audio.offsets, time - shift, _offsetTimeComparator);
               }
               else { //begin of new part
                  if (diffIndex.index[1] !== audio.diff.length) {
                     next = audio.diff[diffIndex.index[1]].start;
                     index = 0;
                  }
               }
               return {
                  locators : audio.locators.slice(Math.max(0, index - 2), index + 1).map(Locator.deserialize),
                  isSkip : Boolean(next),
                  next : next,
                  isEnd : index < 0
               };
            };

            function _find(target, haystack, needle, comparator) {
               var result = target[0];
               var index = -1;
               if (needle) {
                  index = _findIndex(haystack, needle, comparator);
                  result = target[index];
               }
               return result;
            }

            function _findIndex(haystack, needle, comparator) {
               var index = -1;
               var searchResult = search(haystack, needle, comparator);
               if (searchResult.found) {
                  index = searchResult.index;
               }
               else {
                  index = searchResult.index[1];
                  // if (haystack.length === searchResult.index[1]) {
                  //    index = searchResult.index[0];
                  // }
                  // else {
                  //    index = searchResult.index[1];
                  // }
               }
               return index;
            }

            function _diffTimeComparator(diff, time) {
               if (diff.start > time && diff.end > time) {
                  return 1;
               }
               else if (diff.start < time && diff.end < time) {
                  return -1;
               }
               else {
                  return 0;
               }
            }

            function _offsetTimeComparator(offset, time) {
               if (offset[0] > time && offset[1] > time) {
                  return 1;
               }
               else if (offset[0] < time && offset[1] < time) {
                  return -1;
               }
               else {
                  return 0;
               }
            }

         var lith;
         this.setView = function (l) {
            lith = l;
         };

         this.getView = function () {
            return lith;
         };

         }]
   });
});