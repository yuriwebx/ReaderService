define([
   'module',
   'Context',
   'swServiceFactory',
   'underscore'
], function (module, Context, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swStudyClassService',
         'swUserService',
         'swPersonalMessageService',
         '$rootScope',
         'swPublicationsService',
         'swApplicationToolbarService',
         'swOpenPublicationService',
         'swI18nService',
         function (swPopupService,
                   swStudyClassService,
                   swUserService,
                   swPersonalMessageService,
                   $rootScope,
                   swPublicationsService,
                   swApplicationToolbarService,
                   swOpenPublicationService,
                   swI18nService) {
            var popup,
                $scope = $rootScope.$new();
            var isEditor = false;

            $scope.studyClass = null;

            this.showStudyClassInfo = function (studyClassId, invitationMessage) {
               
               swStudyClassService.getStudyClassInfo(studyClassId).then(function(result) {
                  if (result.data) {
                     $scope.studyClass = result.data;
                     $scope.studyClass = _.extend($scope.studyClass.class, {
                        type : 'StudyClass',
                        author : $scope.studyClass && $scope.studyClass.teachers && $scope.studyClass.teachers.length !== 0 ?
                                 $scope.studyClass.teachers[0].firstName + ' ' + $scope.studyClass.teachers[0].lastName :
                                 '',
                        students : $scope.studyClass.summary.numberOfStudents,
                        expectedDuration : $scope.studyClass.class.expectedDuration,
                        teachers : $scope.studyClass.teachers,
                        courseId : $scope.studyClass.studyCourseInfo.course.id,
                        classId : $scope.studyClass.class.classId,
                        course  : $scope.studyClass.studyCourseInfo.course
                     });
                     
                     $scope.detailsApi = {
                        publication : $scope.studyClass,
                        openStudyClass : openStudyClass,
                        closePublicationDetails : closePopup,
                        isPublicationsPersonal : false,
                        message : invitationMessage || {reviewed: true}
                     };

                     if (!popup || popup.isHidden()) {
                        popup = swPopupService.show({
                           content : '<sw-study-class-info details-api="detailsApi"></sw-study-class-info>',
                           header : '<div style="height:44px" class="popup-injectable-template"></div>',
                           scope : $scope,
                           backdropVisible : true,
                           customClass : 'publication-details-popup',
                           layout : {
                              my : 'CC'
                           }
                        });
                     }
                  }
                  else {
                     swPersonalMessageService.updatePersonalMessageState(swUserService.getUserId(), [invitationMessage._id], true);
                  }
               });
            };


            this.showStudyGuideInfo = function(studyGuideId, message) {
               swPublicationsService.getPublicationDetails(studyGuideId, 'remote')
                  .then(function(publication) {
                     publication.id = publication._id;
                     var scope = $scope.$new(true);
                     var isInviteEdit = message.status === Context.parameters.publicationConfig.StudyGuideEditorStatus.active;
                     var typeOfMessag = isInviteEdit ? 'ActivateMessage' : 'DeactivateMessage';
                     var inviteLocalizeLabel = swI18nService.getResource('PublicationDetails.StudyGuide.' + typeOfMessag + '.label') + ' ' + message.fromUserName;

                     isEditor = swApplicationToolbarService.isEditor();
                     publication.isEditInvitation = !_.isUndefined(message);
                     publication.inviteLocalizeLabel = inviteLocalizeLabel;
                     scope.detailsApi = {
                        publication: publication,
                        isEditor: isEditor,
                        openPublication: openPublication,
                        closePublicationDetails: closePopup,
                        isPublicationsPersonal: false
                     };

                     swPersonalMessageService.updatePersonalMessageState(swUserService.getUserId(), [message._id], true);
                     if (!popup || popup.isHidden()) {
                        popup = swPopupService.show({
                           content: '<sw-publication-details details-api="detailsApi"></sw-publication-details>',
                           header: '<div class="popup-injectable-template"></div>',
                           scope: scope,
                           backdropVisible: true,
                           customClass: 'publication-details-popup new-course',
                           layout: {
                              my: 'CC'
                           }
                        });
                     }
                  });
            };

            function openPublication(publication) {
               swOpenPublicationService.openPublication(publication._id, publication.readingPosition, {
                  reload: true,
                  isStudyCourse: publication.type === 'StudyCourse',
                  type: publication.type,
                  classId: publication.classId
               }, true);
               closePopup();
            }

            function openStudyClass(studyClass)
            {
               swStudyClassService.resumeCourse({classId : studyClass.classId});
            }
            
            function closePopup()
            {
               if (popup)
               {
                  popup.hide();
               }
            }
         }]
   });
});