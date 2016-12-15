define([
   'module',
   'swServiceFactory',
   'text!./InviteToStudyClass-header.html'
], function (module, swServiceFactory, headerTemplate) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swStudyClassService',
         'swUserService',
         '$rootScope',
         function (swPopupService, swStudyClassService, swUserService, $rootScope) {
            var classId;
            var afterStudentInvitedFn;

            this.setClassId = function(id) {
               classId = id;
            };

            this.setAfterStudentInvitedFn = function(fn)
            {
               afterStudentInvitedFn = fn;
            };

            this.showInvite = function(studyClassInfo){
               var $scope = $rootScope.$new();
               var popupConfig;
               var popup;

               $scope.config = {
                  hideFn: function(){ if(popup){popup.hide();} },
                  afterInvitedFn: afterStudentInvitedFn,
                  /* jshint ignore:start */
                  afterUsersFoundFn: function(){ popup && popup.layout(); },
                  /* jshint ignore:end */
                  classId: classId
               };

               //$scope.swScrollOptions = {type: 'NONE'};
               if ( studyClassInfo && studyClassInfo.isSharing ) {
                  $scope.sharingData = {
                     name             : 'Class: ' + studyClassInfo.class.name,
                     shortDescription : 'by ' + studyClassInfo.teachers[0].firstName + ' ' + studyClassInfo.teachers[0].lastName,
                     fullDescription  : studyClassInfo.class.description
                  };

                  $scope.content = '<sw-social-sharing sharing-data="sharingData"></sw-social-sharing>' +
                                   '<sw-invite-to-study-class config="config"></sw-invite-to-study-class>';
               }
               else {
                  $scope.content = '<sw-invite-to-study-class config="config"></sw-invite-to-study-class>';
               }

               if (!popup || popup.isHidden()) {
                  popupConfig = {
                     scope: $scope,
                     layout: {
                        my: 'CT',
                        at: 'CT',
                        margin: {
                           top: 80
                        }
                     },
                     modal: false,
                     header: headerTemplate,
                     content: $scope.content,
                     backdropVisible: true,
                     customClass: 'defaultPopup invitePopup'
                  };

                  popup = swPopupService.show(popupConfig);
               }
            };

            this.acceptRequest = function(requestMessage)
            {
               return manageRequest(requestMessage, 'Accepted');
            };
            this.declineRequest = function(requestMessage)
            {
               return manageRequest(requestMessage, 'Declined');
            };
            function manageRequest(requestMessage, status)
            {
               return swStudyClassService.persistClassStudentStatus(swUserService.getUserId(), requestMessage.classId, [requestMessage.userId], status, '');
            }

            this.acceptInvite = function(inviteMessage)
            {
               return manageInvite(inviteMessage, 'Accepted');
            };
            this.declineInvite = function(inviteMessage)
            {
               return manageInvite(inviteMessage, 'Declined');
            };
            function manageInvite(requestMessage, status)
            {
               return swStudyClassService.persistClassStudentStatus(swUserService.getUserId(), requestMessage.classId, [requestMessage.toUserId], status, '');
            }
         }]

   });
});