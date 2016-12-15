/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var q = require('q');
   var _ = require('underscore');

   var db = require('./dao/utils').findDB();
   var inviteController = require('./invite.js');
   var personalMessage  = require('./personalMessage');
   var manageUsers      = require('./manageUsers.js');
   var utils            = require('../utils/utils.js');
   var userPublication  = require('./userpublications.js');

   var config = require(__dirname + '/../utils/configReader.js');

   var deferredDbInsesrt = q.nbind(db.insert, db);
   var deferredDbGet = q.nbind(db.get, db);
   var deferredDbViewWithList = q.nbind(db.view_with_list, db, 'Views');
   var deferredDbView = q.nbind(db.view, db, 'Views');
   var deferredBulkInsert = q.nbind(db.bulk, db);


   var studyGuideEditorActionTypes = config.publicationConfig.StudyGuideEditorActionTypeEnum;
   var studyGuideEditorStatus = config.publicationConfig.StudyGuideEditorStatus;

   function searchEditorsForStudyGuide(studyGuideId, filter, itemsCount) {
      var viewName = 'studyGuideEditorsByStudyGuideId',
         listName = 'studyGuideEditorsDict',
         queryParams = {
            keys: [studyGuideId],
            include_docs: true
         };

      var _editorsDict = {};
      var userSearchObj = {
         category: 'Active Users',
         filter: filter,
         itemsCount: '',
         include_docs: true
      };

      return deferredDbViewWithList(viewName, listName, queryParams)
      .then(function(editors) {
         _editorsDict = _.first(editors);
         return manageUsers.searchUsers(userSearchObj);
      })
      .then(function(users){
         var editors = _.filter(users.result, function(user) {
            return user.editorRole;
         });
         editors = _.map(editors, function(user) {
            return {
               user: manageUsers.createUserProfileView(user),
               alreadyInvited: _.has(_editorsDict, user._id) && (_editorsDict[user._id].status === studyGuideEditorStatus.active || _editorsDict[user._id].status === studyGuideEditorStatus.creator)
            };
         });
         return editors.slice(0, itemsCount);
      })
      .catch(function(err) {
         return err;
      });

   }

   function createStudyGuideEditorAction(userId, status, comment, currentTime) {
      var actionTypeDict = {
         "Creator" : studyGuideEditorActionTypes.studyGuideWasCreated,
         "Active": studyGuideEditorActionTypes.editorWasAdded,
         "Inactive": studyGuideEditorActionTypes.editorWasRemoved
      };
      var studyGuideEditorAction = {
         userId: userId,
         performedAt: currentTime,
         actionType: actionTypeDict[status],
         comment: comment
      };
      return studyGuideEditorAction;
   }

   function createStudyGuideEditor(studyGuideId, userId, currentTime, status) {
      return {
         studyGuideId: studyGuideId,
         editorId: userId,
         registeredAt: currentTime,
         modifiedAt: currentTime,
         status: status,
         StudyGuideEditorActions: [],
         type: 'studyGuideEditor'
      };
   }

   function getStudyGuideEditorsDict(studyGuideId){
      var queryParams = {
        key: studyGuideId,
        include_docs: true
      };
      var viewName = 'studyGuideEditorsByStudyGuideId',
         listName = 'studyGuideEditorsDict';
      return deferredDbViewWithList(viewName, listName, queryParams);
   }

   function updateMatirialsEditors(userIds, creatorId, publicationId) {
      return deferredDbView('materialsStudyGuides', {
            key: [creatorId, publicationId],
            reduce: false,
            include_docs: true
         })
         .spread(function(body) {
            if(body.rows.length === 0) {
               return q.reject(utils.addSeverityResponse('Has not found materials for add editors.', config.businessFunctionStatus.error));
            }
            else {
               var materials = body.rows[0].doc;
               materials.userIds = userIds;
               return db.insert(materials);
            }
         })
         .catch(function(err) {
            throw err;
         });
   }

   function persistStudyGuideEditorsStatus(userId, studyGuideId, editorIds, status, comment) {
      var _emailRecipientIds = [],
         _userIdsForRemoveUserPublication = [],
         _currentStudyGuide = {},
         _senderProfile = {};

      if (!_.isArray(editorIds) || editorIds.length === 0 || !_.isString(studyGuideId)) {
         var response = utils.addSeverityResponse('In persistStudyGuideEditorsStatus ' + editorIds + ' ' + studyGuideId + ' .', config.businessFunctionStatus.error);
         return q.reject(response);
      }
      return deferredDbGet(studyGuideId)
         .spread(function(currentStudyGuide) {
            _currentStudyGuide = currentStudyGuide;
            _.each(editorIds, function(editorId) {
               if ((status === studyGuideEditorStatus.creator && _currentStudyGuide.userIds.length === 0) ||
                  (status === studyGuideEditorStatus.active && _currentStudyGuide.userIds.indexOf(editorId) === -1)) {
                  _currentStudyGuide.userIds.push(editorId);
                  _emailRecipientIds.push(editorId);
               }
               else if (status === studyGuideEditorStatus.inactive && _currentStudyGuide.userIds.indexOf(editorId) !== -1) {
                  _currentStudyGuide.userIds = _.without(_currentStudyGuide.userIds, editorId);
                  _userIdsForRemoveUserPublication.push(editorId);
               }
            });
            return deferredDbInsesrt(_currentStudyGuide);
         })
         .then(function() {
            var persistUserPublicationPromises = [];
            var params = {
               publicationId: _currentStudyGuide._id,
               publicationType: 'Book',
               personal: true,
               lastOpenedAt: 0
            };
            _emailRecipientIds = _.without(_emailRecipientIds, userId);
            if (_emailRecipientIds.length !== 0) {
               persistUserPublicationPromises.push(userPublication.updateUserPublicationByUserIds(_emailRecipientIds, _currentStudyGuide._id, params));
            }
            _userIdsForRemoveUserPublication = _.without(_userIdsForRemoveUserPublication, userId);
            if (_userIdsForRemoveUserPublication.length !== 0) {
               params.personal = false;
               persistUserPublicationPromises.push(userPublication.updateUserPublicationByUserIds(_userIdsForRemoveUserPublication, _currentStudyGuide._id, params));
            }
            return q.all(persistUserPublicationPromises);
         })
         .then(function() {
            return getStudyGuideEditorsDict(studyGuideId);
         })
         .spread(function(studyGuideEditorsDict) {
            var currentEditors = _.map(editorIds, function(editorId) {
               var currentTime = Date.now();
               var studyGuideEditorAction = createStudyGuideEditorAction(editorId, status, comment, currentTime);
               var editor = _.has(studyGuideEditorsDict, editorId) ?
                  studyGuideEditorsDict[editorId] : createStudyGuideEditor(studyGuideId, editorId, currentTime, status);
               if (editor.status !== studyGuideEditorStatus.creator) {
                  editor.status = status;
                  editor.StudyGuideEditorActions.push(studyGuideEditorAction);
               }
               return editor;
            });
            return deferredBulkInsert({
               docs: currentEditors
            });
         })
         .then(function() {
            return updateMatirialsEditors(_currentStudyGuide.userIds, _.first(_currentStudyGuide.userIds), studyGuideId);
         })
         .then(function() {
            var _personalMessageRecipientIds = _.without(editorIds, userId);
            var subject = 'Invite';
            var extendMessageParams = {
               studyGuideId: studyGuideId,
               status: status,
               type: config.messageTypes.studyGuide
            };
            if (_personalMessageRecipientIds.length !== 0) {
               return personalMessage.persist(userId, _personalMessageRecipientIds, comment, subject, extendMessageParams);
            }
            else {
               return q.resolve({
                  status: config.businessFunctionStatus.ok
               });
            }
         })
         .thenResolve(manageUsers.getUser(userId))
         .then(function(senderProfile) {
            _senderProfile = senderProfile;
            return deferredDbGet(_currentStudyGuide.bookId);
         })
         .spread(function(book) {
            var inviteContext = {
               status: status,
               studyGuideId: _currentStudyGuide._id
            };
            var emailInfoParams = {
               studyGuideName: _currentStudyGuide.name,
               bookName: book.name,
               emailTitleSuffix: _currentStudyGuide.name,
               editorName: _senderProfile.firstName + ' ' + _senderProfile.lastName
            };
            if (_emailRecipientIds.length !== 0) {
               return inviteController.sendEmailInvite(_emailRecipientIds, inviteContext, emailInfoParams, 'en', _senderProfile);
            }
            else {
               return q.resolve({
                  status: config.businessFunctionStatus.ok
               });
            }
         })
         .catch(function(err) {
            return err;
         });
   }

   module.exports = {
      searchEditors            : searchEditorsForStudyGuide,
      persistEditorsStatus     : persistStudyGuideEditorsStatus,
      getStudyGuideEditorsDict : getStudyGuideEditorsDict
   };
})();