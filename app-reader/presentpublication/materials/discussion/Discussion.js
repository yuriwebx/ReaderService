define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./Discussion.html',
   'less!./Discussion.less'
], function(module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         data: '=',
         isManageClass: '@',
         remove: '&'
      },
      controller : [
         '$scope',
         '$element',
         '$timeout',
         'swUserService',
         'swManageClassDiscussionsService',
         'swApplicationToolbarService',
         'swStudyClassService',
         'swContextPopupService',
         'swScrollFactory',
         'swFeatureDetector',
         'swPublicationsService',
         function(
            $scope,
            $element,
            $timeout,
            swUserService,
            swManageClassDiscussionsService,
            swApplicationToolbarService,
            swStudyClassService,
            swContextPopupService,
            swScrollFactory,
            swFeatureDetector,
            swPublicationsService
         ) {
            var user = swUserService.getUser();
            var studyClassInfo = swStudyClassService.getCurrentStudyClassInfo();

            $scope.DATE_FORMAT             = "MMM d, y 'at' h:mm a";
            $scope.isManageClassDiscussion = $scope.isManageClass === 'true';
            $scope.limitMessage            = $scope.isManageClassDiscussion ? null : 3;
            $scope.discussionModel         = {};
            $scope.isPhoto                 = user.isPhoto;
            $scope.userPhoto               = user.photo;
            $scope.publicationTitle        = '';
            $scope.isEditor                = swApplicationToolbarService.isEditor();

            $scope.swInit                      = _init;
            $scope.getParagraphNum             = getParagraphNum;
            $scope.validateTextField           = validateTextField;
            $scope.toggleEditTopic             = toggleEditTopic;
            $scope.scrollIntoViewOnFocus       = scrollIntoViewOnFocus;
            $scope.updateClassDiscussionState  = updateClassDiscussionState;
            $scope.showDiscussionTaskEditPopup = showDiscussionTaskEditPopup;
            $scope.getUnreadMessages           = getUnreadMessages;
            $scope.isAuthor                    = isAuthor;

            function _init () {
               $scope.data = _prepare($scope.data);
               _preparePublicationInfo($scope.data);
            }

            function isAuthor () {
               return studyClassInfo && studyClassInfo.userRole && studyClassInfo.userRole === 'Teacher' ||
                      $scope.data && (!$scope.data.authorId || $scope.data.authorId === user.userId);
            }

            function validateTextField(value) {
               return {
                  required: {
                     value: value,
                     active: true
                  }
               };
            }

            function updateClassDiscussionState() {
               swManageClassDiscussionsService.setClassDiscussionState($scope.data._id, $scope.data.frozen)
                  .then(_.noop, function () {
                     $scope.data.frozen = false;
                  });
            }

            function toggleEditTopic() {
               if (!$scope.isManageClassDiscussion) {
                  showEditDiscussionPopup({action: 'Edit'});
                  return;
               }

               $scope.data.editTopic = !$scope.data.editTopic;
               if ( $scope.data.editTopic ) {
                  $scope.discussionModel.topic = $scope.data.topic;
               }
            }

            function updateDiscussionData(data) {
               $scope.data = _prepare(data[0]);
            }

            function showDiscussionTaskEditPopup () {
               var _extendObj = {
                  popupClose : _.noop,
                  action     : $scope.isEditor ? 'Edit' : 'Participate'
               };
               setMessagesReviewed($scope.data);
               showEditDiscussionPopup(_extendObj);
            }

            function showEditDiscussionPopup(_extendObj) {
               swContextPopupService.showPopup({extend: _extendObj, callback: updateDiscussionData}, 'discussion', $scope.data);
            }

            function scrollIntoViewOnFocus() {
               if (swFeatureDetector.isTouchInput()) {
                  scrollIntoView(_getMyCommentEl());
               }
            }

            function scrollIntoView (el) {
               if ($scope.isManageClassDiscussion) {
                  return;
               }
               $timeout(function () {
                  var scroll = swScrollFactory.getParentScroll(el);
                  if (scroll) {
                     scroll.scrollIntoViewIfNeeded(el, false);
                  }
               }, 300);
            }

            function _getMyCommentEl() {
               return $element.find('.sw-discussion-my-comment');
            }

            function getParagraphNum (_locator) {
               return _locator && _locator.substr(_locator.indexOf("_") + 1) || '';
            }

            function _prepare (_discussion) {
               if ( typeof _discussion === 'object' ) {
                  _discussion.lastActivity = _getLastActivity(_discussion);
               }
               return _discussion;
            }

            function _preparePublicationInfo (_discussion) {
               if ( !_discussion ) {
                  return;
               }
               $scope.publicationTitle = '';
               var _id = _discussion.bookId;
               if (_id) {
                  swPublicationsService.getBookInfo(_id)
                      .then(function (_response) {
                         _response = _response && _response.data || {};
                         $scope.publicationTitle = _response.book && _response.book.name || '';
                      });
               }
            }

            function _getLastActivity (_discussion) {
               var lastMessage = _.last(_.chain(_discussion.messages).sortBy('createdAt').value());
               return lastMessage ? lastMessage.createdAt : _discussion.createdAt;
            }

            function setMessagesReviewed ( _discussion, _revState ) {
               if ( typeof _discussion === 'object' ) {
                  _.each(_discussion.messages, function (_mes) {
                     _mes.reviewed = _revState !== undefined ? _revState : true;
                  });
               }
            }

            function getUnreadMessages () {
                var notReviewedMessages = _.filter($scope.data.messages, function (_mes) {
                  return !_mes.reviewed;
               });
               $scope.unreadCount = notReviewedMessages.length;
               return $scope.unreadCount;
            }
         }]
   });
});