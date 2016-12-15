define([
   'module',
   'moment',
   'underscore',
   'swComponentFactory',
   'text!./ParticipateInDiscussion.html',
   'less!./ParticipateInDiscussion'
], function (module, moment, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         headerFn: '=',
         discussionData: '=',
         updatePopupLayout: '&'
      },
      controller: [
         '$scope',
         'swUtil',
         'swUserService',
         'swStudyClassService',
         'swManageClassDiscussionsService',
         'swNotificationService',
         '$timeout',
         'swContentProvider',
         function (
            $scope,
            swUtil,
            swUserService,
            swStudyClassService,
            swManageClassDiscussionsService,
            swNotificationService,
            $timeout,
            swContentProvider) {
            var vm                  = $scope;
            var user                = swUserService.getUser();
            var DATE_FORMAT_CURRENT = "MMM d [аt] h:mm a";
            var DATE_FORMAT_PAST    = "MMM d, y [аt] h:mm a";

            vm.userMessage         = {};
            vm.teachers            = {};
            vm.disableSendButton   = false;
            vm.userMessage.text    = '';
            vm.isReplyView         = false;
            vm.parentMessageId     = '';
            vm.isPhoto             = _.has(user, 'photo.fileHash');
            vm.userPhoto           = getPhotoLink(user);

            vm.swInit                   = _init;
            vm.swDestroy                = _destroy;
            vm.sendMessage              = sendMessage;
            vm.reply                    = reply;
            vm.headerFn.back            = backToMainView;
            vm.headerFn.persistFn       = _persistDiscussion;
            vm.toggleComments           = toggleComments;
            vm.filterMessages           = filterMessages;
            vm.filterComments           = filterComments;
            vm.orderComments            = orderComments;
            vm.toggleTextVisibilityView = toggleTextVisibilityView;
            vm.getPhotoLink             = getPhotoLink;
            vm.formatDate               = formatDate;

            function getPhotoLink(user) {
               return _.has(user, 'photo.fileHash') ? swUserService.getUserPhoto(user.photo.fileHash) : false;
            }


            function filterMessages (_message) {
               return _message.level === 0;
            }

            function filterComments (_message) {
               return function (_comment) {
                  return _comment.parentMessageId === _message.messageId && _comment.level === 1;
               };
            }

            function orderComments (_message) {
               return function (_comment) {
                  return _message.commentsVisible ? _comment.createdAt : [_comment.userRole, _comment.createdAt];
               };
            }

            function _init () {
               if ( vm.discussionData.classId && vm.discussionData.classId.length > 0 ) {
                  getClassTeachers(vm.discussionData);
               }
               toggleComments();
               swManageClassDiscussionsService.updateUserDiscussionMessagesState([{classDiscussionId: vm.discussionData._id, classId: vm.discussionData.classId}], true, true);
               swNotificationService.addNotificationListener('discussions', function () {
                  return {
                     classId : vm.discussionData.classId
                  };
               }, _onDiscussionsUpdate);
            }

            function _destroy () {
               swNotificationService.removeNotificationListener('discussions', _onDiscussionsUpdate);
               _setActiveMessagesState(false);
               vm.parentMessageId = '';
            }

            function sendMessage () {
               var persistData;
               if ( vm.userMessage.text && !vm.disableSendButton ) {
                  persistData = vm.isReplyView ? _preparePersistData(1) : _preparePersistData(0);
                  _persist(persistData).then(function () {
                     if ( vm.isReplyView)  {
                        _setActiveMessagesState(true);
                     }
                  });
                  updatePopupLayout();
               }
            }

            function reply (_messageId) {
               vm.parentMessageId = _messageId;
               vm.isReplyView = vm.headerFn.isReplyView = true;
               _setActiveMessagesState(true);
            }

            function backToMainView () {
               _setActiveMessagesState(false);
               vm.parentMessageId = '';
               vm.isReplyView = vm.headerFn.isReplyView = false;
               toggleComments();
            }

            function _setActiveMessagesState (_isActive) {
               _.each(vm.discussionData.messages,
                  function (_m) {
                     if ( _m.messageId === vm.parentMessageId ) {
                        _m.active = _isActive;
                     }
                  });
            }

            function _preparePersistData (_level) {
               return {
                  reviewed          : true,
                  messageId         : swUtil.uuid(),
                  parentMessageId   : vm.parentMessageId,
                  level             : _level,
                  classDiscussionId : vm.discussionData._id,
                  authorId          : user.id,
                  classId           : vm.discussionData.classId,
                  createdAt         : Date.now(),
                  modifiedAt        : Date.now(),
                  text              : vm.userMessage.text,
                  userRole          : !!vm.teachers[user.id] && 'Teacher' || 'Student',
                  userProfile       : {
                     firstName : user.firstName,
                     lastName  : user.lastName,
                     photo     : user.photo
                  }
               };
            }

            function _persist (_data) {
               vm.disableSendButton = true;
               return swManageClassDiscussionsService.persistDiscussionMessage(_data)
                  .then(function () {
                     if ( !vm.discussionData.messages ) {
                        vm.discussionData.messages = [];
                     }
                     vm.discussionData.messages.push(_data);
                     vm.userMessage.text = '';
                     vm.disableSendButton = false;
                     if (_.has(vm.discussionData, 'locator')) {
                        swContentProvider.onMaterialsChange('classDiscussions', vm.discussionData, 'update');
                     }
                  }, function () {
                     vm.disableSendButton = false;
                  });
            }

            function _persistDiscussion () {
               $scope.headerFn.closePopup($scope.discussionData);
            }

            function toggleComments (_message) {
               _.each(vm.discussionData.messages, function (_m) {
                  if ( _message && _message.messageId === _m.messageId ) {
                     _m.commentsVisible = !_m.commentsVisible;
                  }
                  else {
                     _m.commentsVisible = false;
                  }
               });
            }

            function getClassTeachers (_data) {
               return swStudyClassService.getStudyClassInfo(_data.classId, '', '')
                  .then(function (response) {
                     _.each(response.data.teachers, function (_t) {
                        vm.teachers[_t.userId] = _t;
                     });
                  });
            }

            function _onDiscussionsUpdate (_options) {
               $timeout(function () {
                  var _discussionData = _.find(_options, {_id: vm.discussionData._id});
                  _mergeByProperty(vm.discussionData.messages, _discussionData.messages, 'messageId');
               });
            }

            function toggleTextVisibilityView (_message) {
               _message.isFullVisible = !_message.isFullVisible;
               _.each(vm.discussionData.messages, function (_m) {
                  if ( _m.level === 0 &&_message.messageId !== _m.messageId ) {
                     _m.isFullVisible = false;
                  }
               });
            }

            function _mergeByProperty (arr1, arr2, prop) {
               _.each(arr2, function(arr2obj) {
                  var arr1obj = _.find(arr1, function(arr1obj) {
                     return arr1obj[prop] === arr2obj[prop];
                  });
                  if ( arr1obj ) {
                     _.extend(arr1obj, arr2obj);
                  }
                  else {
                     arr1.push(arr2obj);
                  }
               });
            }

            function updatePopupLayout() {
               $timeout(function(){
                  vm.updatePopupLayout();
               });
            }

            var currentYear = new Date().getYear();
            function formatDate (date) {
               var commentYear = new Date(date).getYear();
               return commentYear < currentYear ? moment(date).format(DATE_FORMAT_PAST) : moment(date).format(DATE_FORMAT_CURRENT);
            }
         }]
   });
});