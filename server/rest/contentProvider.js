/*jslint node: true */
(function () {
   'use strict';
   var _             = require('underscore');
   var utils         = require('../utils/utils.js');
   var publications  = require('./publication');
   var blocks        = require('./fetchblocks');
   var tests         = require('./manageTests');
   var materials     = require('./materials');
   var essayTasks    = require('./manageEssayTask');
   var manageUsers   = require('./manageUsers.js');
   var studyGuide    = require('./studyGuide.js');
   var config        = require(__dirname + '/../utils/configReader.js');
   var discussions   = require('./discussion');

   var classMaterials  = [ // available in class
      'essayTask',
      'paraSize',
      'test'
   ];
   var editorMaterials = [ // available only in editor
      'discussionTasks',
   ];

   var initPublicationPresentation = function (userId, queryParams) {
      var publicationPresentation = {
         audio : {
            offsets : [],
            locators : []
         }
      };
      var publicationId = queryParams.publicationId;
      var classId       = queryParams.classId;
      var range         = queryParams.range;
      var isEditor      = JSON.parse(queryParams.editor);
      var isDownloaded  = JSON.parse(queryParams.isDownloaded);
      var userIds       = [];

      return publications.get(publicationId) //use isDownloaded to skip all this steps =(
         .then(function checkPublicationType(publication) {
            var publicationSummary = {};
            if (publication.type === 'StudyGuide') {
               userIds = publication.userIds;
               publicationSummary = publications.getStudyGuideInfo(userId, publicationId);
            }
            else if (publication.collection) {
               publicationSummary = publications.getCollectionInfo(userId, publication.collection);
            }
            else {
               publicationSummary = publications.getBookInfo(userId, publicationId);
            }
            return publicationSummary;
         })
         .then(function getPublicationSummary(publicationSummary) {
            var itemIndex  = -1;
            var prevItemId = 0;
            var nextItemId = 0;
            var _promise   = null;
            if (isCollection(publicationSummary)) {
               for (var i = 0, len = publicationSummary.books.length; i < len; i++) {
                  if (publicationSummary.books[i].id === publicationId) {
                     itemIndex = i;
                     break;
                  }
               }
               if (itemIndex) {
                  prevItemId = publicationSummary.books[itemIndex - 1].id;
               }
               if (itemIndex < publicationSummary.books.length - 1) {
                  nextItemId = publicationSummary.books[itemIndex + 1].id;
               }
               _promise = publications.getBookInfo(userId, publicationId)
                  .then(function (bookSummary) {
                     publicationPresentation.details = bookSummary;
                     if (prevItemId) {
                        publicationPresentation.details.book.prevItemId = prevItemId;
                     }
                     if (nextItemId) {
                        publicationPresentation.details.book.nextItemId = nextItemId;
                     }
                  });
            }
            else {
               publicationPresentation.details = publicationSummary;
            }
            return _promise;
         })
         .then(function () {
            return isDownloaded ? [] : blocks.fetchAll(
               publicationPresentation.details.book.id,
               publicationPresentation.details.book.version[0].content);
         })
         .then(function (blocks) {
            if (range && Array.isArray(blocks)) {
               blocks = blocks.slice(range[0], range[1]);
            }
            publicationPresentation.content = blocks;

            return materials.fetch(userId, {
               bookId : publicationId,
               editor : isEditor.toString()
            });
         })
         .then(function getMaterials(materials) {
            publicationPresentation.materials = materials;

            return tests.getTestsList({
               publicationId : publicationId
            }, userId);
         })
         .then(function (tests) {
            publicationPresentation.materials.test = tests;

            return essayTasks.getEssayTasksList({
               publicationId : publicationId
            }, userId);

         })
         .then(function (essayTasks) {
            publicationPresentation.materials.essayTask = essayTasks;

            delete publicationPresentation.materials.type; // ??!

            if (!isEditor) {
               publicationPresentation.materials =
                  _.omit(publicationPresentation.materials, editorMaterials);
            }
            if (!classId && !isEditor) {
               publicationPresentation.materials =
                  _.omit(publicationPresentation.materials, classMaterials);
            }

            if (userIds.length) {
               return manageUsers.getUserProfiles(userIds)
                  .then(function(editors) {
                     var editorsProfileView = _.map(editors, function(user) {
                        return {
                           user: manageUsers.createUserProfileView(user),
                           editorStatus: ''
                        };
                     });
                     publicationPresentation.details.editors = editorsProfileView;
                     return studyGuide.getStudyGuideEditorsDict(publicationPresentation.details.id);
                  })
                  .spread(function(editorsDict) {
                     _.each(publicationPresentation.details.editors, function(editor) {
                        if (_.has(editorsDict, editor.user.userId)) {
                           editor.editorStatus = editorsDict[editor.user.userId].status;
                        }
                     });
                  });
            }

         })
         .then(function () {
            return !classId ? publicationPresentation :
               discussions.searchClassDiscussions(classId, publicationId, userId)
                  .then(function onClassDiscussionsSearch (classDiscussions) {
                     publicationPresentation.materials.classDiscussions = classDiscussions;
                     return publicationPresentation;
                  });

         })
         .catch(function (err) {
            var errMsg = '';
            if (!_.has(err, 'statusMessages')) {
               errMsg = _.has(err, 'description') ? err.description : err;
               err = utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error);
            }
            throw err;
         });
   };

   function getAudioIndex (sourceId) {
      return blocks.fetchAudio(sourceId).then(function (audioData) {
         return audioData;
      });
   }

   function isCollection(publicationSummary) {
      return _.has(publicationSummary, 'books');
   }

   // function getAudioPrefix(metadata) {
   //    var narrator = metadata.audioNarrator;
   //    var source = metadata.audioSource;
   //    var bitRate = metadata.bitRate;
   //    var prefix = '';

   //    if (!narrator || !source || !bitRate) {
   //       return prefix;
   //    }
   //    prefix = utils.getMD5Hash(narrator + source);
   //    return [prefix, ('' + bitRate).slice(0, 2), 'm4a'].join('-');
   // }

   module.exports = {
      init : initPublicationPresentation,
      getAudioIndex : getAudioIndex
   };
})();