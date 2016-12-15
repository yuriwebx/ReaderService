define([
   'module',
   'swComponentFactory',
   'Context',
   'moment',
   'text!./StudyClassInfo.html',
   'text!./StudyClassDetailsTemplate.html',
   'less!./PublicationDetails'
], function (module, swComponentFactory, Context, moment, template, studyClassDetailsTemplate) {
   "use strict";

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         popupReady: '@',
         detailsApi : '='
      },
      controller : [
         '$scope',
         'swPublicationsService',
         'swStudyClassService',
         'swUserService',
         'swManagePersonalMessagesService',
         'swInviteToStudyClassService',
         'swPersonalMessageService',
         'swBeginNewCourseService',
         function (
            $scope,
            swPublicationsService,
            swStudyClassService,
            swUserService,
            swManagePersonalMessagesService,
            swInviteToStudyClassService,
            swPersonalMessageService,
            swBeginNewCourseService) {
            var vm = $scope,
                userId,
                dateFormat = Context.parameters.defaultDateFormat,
                currentDate = new Date().getTime();

            vm.newStudy            = false;
            vm.courseId            = '';
            vm.relatedPublications = [];
            vm.publication         = vm.detailsApi.publication;
            vm.joinEndDate         = moment(vm.publication.joinEndDate).format(dateFormat);
            vm.isJoinDateExpired   = !vm.publication.expectedDailyWork ? false : new Date(vm.publication.joinEndDate).setHours(23, 59, 59, 999) < currentDate;

            $scope.swInit = swInit;

            vm.beginNewCourse                = beginNewCourse;
            vm.resumeCourse                  = resumeCourse;
            vm.getCoverSrc                   = getCoverSrc;
            vm.showMainPublicationData       = showMainPublicationData;
            vm.showAdditionalPublicationData = showAdditionalPublicationData;
            vm.acceptInvitation              = acceptInvitation;
            vm.declineInvitation             = declineInvitation;
            vm.firstLetterUpperCase          = firstLetterUpperCase;
            vm.showDifficulty                = swPublicationsService.showDifficulty;

            function swInit () {
               initTemplate();

               vm.courseId = vm.publication.id || vm.publication.classId;
               userId = swUserService.getUserId();

               vm.isMainPublicationData = true;
               vm.isAuthor = userId === vm.publication.userId;

               if ( vm.detailsApi.message && vm.detailsApi.message.studentConfirmationStatus === 'Accepted' ) {
                  swPersonalMessageService.updatePersonalMessageState(userId, [vm.detailsApi.message._id], true);
               }

               vm.isCancelled = vm.detailsApi.message && vm.detailsApi.publication.studyClassStatus === 'Cancelled';

               vm.isBlocked = vm.detailsApi.message && vm.detailsApi.message.teacherStatus === 'Blocked' && !vm.isCancelled;

               vm.isInvite = vm.detailsApi.message && vm.detailsApi.message.studentConfirmationStatus !== 'Accepted' && !vm.isCancelled && !vm.isBlocked;

               vm.isCourseActive = !vm.detailsApi.message || (vm.detailsApi.message && vm.detailsApi.message.studentConfirmationStatus === 'Accepted') &&
                                   !vm.detailsApi.isEditor && !vm.isCancelled && !vm.isInvited && !vm.isBlocked;

            }

            function beginNewCourse () {
               swBeginNewCourseService.showPopup(vm.publication);
            }

            function resumeCourse () {
               if (vm.detailsApi.message) {
                  swManagePersonalMessagesService.markMessageAsRead(vm.detailsApi.message).then(function() {
                     vm.detailsApi.openStudyClass(vm.publication, vm.publication.type);
                     vm.detailsApi.closePublicationDetails();
                  });
               }
               else {
                  vm.detailsApi.openStudyClass(vm.publication, vm.publication.type);
                  vm.detailsApi.closePublicationDetails();
               }
            }

            function getCoverSrc (book) {
               return swPublicationsService.getCoverPath(book, 'extralarge', '#');
            }

            function showMainPublicationData () {
               vm.isMainPublicationData = true;
            }

            function showAdditionalPublicationData () {
               vm.isMainPublicationData = false;
            }

            function acceptInvitation () {
               swInviteToStudyClassService.acceptInvite(vm.detailsApi.message).then(function(){
                  swManagePersonalMessagesService.markMessageAsRead(vm.detailsApi.message).then(function(){
                     vm.detailsApi.openStudyClass(vm.publication, vm.publication.type);
                     vm.detailsApi.closePublicationDetails();
                  });
               });
            }

            function declineInvitation () {
               swInviteToStudyClassService.declineInvite(vm.detailsApi.message).then(function(){
                  swManagePersonalMessagesService.markMessageAsRead(vm.detailsApi.message).then(function() {
                     vm.detailsApi.closePublicationDetails();
                  });
               });
            }

            function firstLetterUpperCase (string) {
               return string.charAt(0).toUpperCase() + string.substring(1);
            }

            function initTemplate() {
               if ( vm.publication.classId )
               {
                  vm.publicationDetailsTemplate = studyClassDetailsTemplate;
                  vm.labelKey = 'PublicationDetails.StudyProjectInfo.header.label';
                  getClassContent();
               }
            }

            function getClassContent() {
               swStudyClassService.getStudyClassInfo(vm.publication.classId).then(function (response) {
                   vm.relatedPublications = response.data.studyCourseInfo.details;
                });
            }
         }]
   });
});
