define([
   'Context',
   'moment',
   'module',
   'underscore',
   'swComponentFactory',
   'text!./ManagePersonalMessages.html',
   'less!./ManagePersonalMessages.less'
], function(Context, moment, module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         config: '='
      },
      controller: [
         '$scope',
         'swPersonalMessageService',
         'swManagePersonalMessagesService',
         'swPublicationDetailsService',
         'swUserService',
         'swStudyClassService',
         'swApplicationToolbarService',
         'swI18nService',
         'swPublicationsService',
         'swLayoutManager',
         function(
            $scope,
            swPersonalMessageService,
            swManagePersonalMessagesService,
            swPublicationDetailsService,
            swUserService,
            swStudyClassService,
            swApplicationToolbarService,
            swI18nService,
            swPublicationsService,
            swLayoutManager) {
            var vm = $scope;
            var userId = swUserService.getUserId();
            var isEditor = swApplicationToolbarService.isEditor();
            var messageTypes = Context.parameters.messageTypes || {};
            var messageLabelMap = {};

            vm.swInit = init;
            vm.viewMessage = viewMessage;

            vm.messages = [];
            vm.resolved = false;

            function init () {
               vm.resolved = false;
               swPersonalMessageService.searchPersonalMessage(null).then(searchMessages);

               function searchMessages (result) {
                  vm.resolved = true;
                  _.each(result.data, function (message) {
                     if ( isMessageAllowed(message) ) {
                        if ( message.classId ) {
                           swStudyClassService.getStudyClassInfo(message.classId)
                               .then(function (result) {
                                  if ( !isTeacher(result.data.teachers) ) {
                                     addToMessages(message, result.data.studyCourseInfo);
                                  }
                               });
                        }
                        else {
                           addToMessages(message);
                        }
                     }
                  });
               }

               function isTeacher (teachers) {
                  return _.every(teachers, function(t) {
                     return t._id === userId;
                  });
               }

               function isMessageAllowed (message) {
                  return isEditor && message.type === messageTypes.studyGuide ||
                         !isEditor && message.type === messageTypes.studyClass ||
                         message.type === messageTypes.personal;
               }
            }

            function addToMessages(message, classInfo) {
               var courseInfo = classInfo && classInfo.course;

               swUserService.getUserProfileState(message.fromUserId).then(prepareMessage);
               function prepareMessage (profileInfo) {
                  var haveCover = false;
                  _.extend(message, {
                     isUserPhoto       : profileInfo.userProfileInfo.isPhoto,
                     userPhotoLink     : profileInfo.userProfileInfo.photoLink,
                     fromUserName      : profileInfo.userProfileInfo.firstName + ' ' + profileInfo.userProfileInfo.lastName,
                     registeredAt      : message.registeredAt,
                     registeredAtInMin : moment(message.registeredAt).fromNow()
                  });
                  message.label = _getMessageLabel(message, courseInfo);
                  message.coverUrl = swPublicationsService.getCoverPath(courseInfo, 'small');
                  haveCover = !!message.coverUrl;
                  if (!message.userPhotoLink) {
                     message.coverType = "UserDefaultPhoto";
                  }
                  if (message.userPhotoLink) {
                     message.coverType = "UserPhoto";
                  }
                  if (haveCover && message.type !== "PersonalMessage") {
                     message.coverType = "PublicationCover";
                  }
                  if (!haveCover && message.type !== "PersonalMessage") {
                     message.coverType = "SyllabusCover";
                  }
                  vm.messages = vm.messages || []; 
                  vm.messages.push(message);
                  swLayoutManager.layout('initiating');
               }
            }

            messageLabelMap[messageTypes.studyClass] = getClassMessageLabel;
            messageLabelMap[messageTypes.studyGuide] = getStudyGuideMessageLabel;
            messageLabelMap[messageTypes.personal] = getPersonalMessageLabel;

            function _getMessageLabel (message, courseInfo) {
               return messageLabelMap[message.type](message, courseInfo);
            }

            function getClassMessageLabel (message, courseData) {
               var params = {
                     messageFrom : message.fromUserName,
                     courseName  : courseData.name
                   };

               if ( message.studyClassStatus === 'Cancelled' ) {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.closed.label', params);
               }
               if ( message.teacherStatus === 'Blocked' ) {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.blocked.label', params);
               }
               if ( message.studentConfirmationStatus === 'Requested' ) {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.requested.label', params);
               }
               else if ( message.studentConfirmationStatus === 'Accepted' ) {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.accepted.label', params);
               }
               else if ( message.studentConfirmationStatus === 'Declined' ) {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.declined.label', params);
               }
               else {
                  return swI18nService.getResource('ManagePersonalMessages.preview.studyClass.closed.label', params);
               }
            }

            function getStudyGuideMessageLabel (message) {
               return swI18nService.getResource('ManagePersonalMessages.preview.studyGuide.closed.label', {messageFrom : message.fromUserName});
            }

            function getPersonalMessageLabel (message) {
               return swI18nService.getResource('ManagePersonalMessages.preview.personal.closed.label', {messageFrom : message.fromUserName});
            }

            function viewMessage(message) {
               var currentMessage = _.find($scope.messages, {_id: message._id});

               swManagePersonalMessagesService.markMessageAsRead(message)
                   .then(function () {
                      currentMessage.reviewed = true;
                      if (message.classId) {
                         swPublicationDetailsService.showStudyClassInfo(message.classId, message);
                      }
                      else if (message.studyGuideId) {
                         swPublicationDetailsService.showStudyGuideInfo(message.studyGuideId, message);
                      }
                      else {
                         swManagePersonalMessagesService.viewMessage(message);
                      }
                   });
            }
         }
      ]
   });
});