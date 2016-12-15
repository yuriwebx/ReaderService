define([
   'module',
   'swAppUrl',
   'underscore',
   'swComponentFactory',
   'Context',
   'text!./PublicationDetails.html',
   'text!./PublicationDetailsTemplate.html',
   'text!./StudyClassDetailsTemplate.html',
   'text!./StudyCourseDetailsTemplate.html',
   'text!./StudyGuideDetailsTemplate.html',
   'text!./CollectionDetailsTemplate.html',
   'less!./PublicationDetails'
], function (
   module,
   swAppUrl,
   _,
   swComponentFactory,
   Context,
   template,
   publicationDetailsTemplate,
   studyClassDetailsTemplate,
   studyCourseDetailsTemplate,
   studyGuideDetailsTemplate,
   collectionDetailsTemplate) {
   "use strict";

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         popupReady: '@',
         detailsApi: '='
      },
      controller: [
         '$scope',
         'swPublicationsService',
         'swUserPublicationService',
         'swStudyCourseService',
         'swUserService',
         'swVocabularyAssessmentService',
         'swDirectVocabularyService',
         'swStudyClassService',
         'swLayoutManager',
         'swOfflineModeService',
         function (
            $scope,
            swPublicationsService,
            swUserPublicationService,
            swStudyCourseService,
            swUserService,
            swVocabularyAssessmentService,
            swDirectVocabularyService,
            swStudyClassService,
            swLayoutManager,
            swOfflineModeService) {
            var vm             = $scope;
            var userId         = swUserService.getUserId(),
                appUrlFragment = swAppUrl.withoutFragment.replace(/\/reader\/$/, '/editor/'),
                userProfile    = swUserService.getUser();

            vm.newStudy              = false;
            vm.courseId              = '';
            vm.relatedPublications   = [];
            vm.relatedConfig         = {};
            vm.publication           = vm.detailsApi.publication;
            vm.bookExportConfig      = {
               exportImportLabel : "ExportImport.exportImport.label",
               importLabel       : "ExportImport.import.label",
               isAuthor          : true
            };
            vm.studyGuideExportConfig = {
               exportImportLabel : "ExportImport.exportImport.label",
               importLabel       : "ExportImport.importStudyGuide.label"
            };
            vm.detailsApi.back       = initTemplate;
            vm.isWideMedia           = !!swLayoutManager.context().media.wide;
            vm.detailsApi.isOffline  = swOfflineModeService.isOffline();

            vm.swInit                        = _init;
            vm.swDestroy                     = _destroy;
            vm.swLayout                      = swLayout;
            vm.acceptInvitation              = acceptInvitation;
            vm.declineInvitation             = declineInvitation;
            vm.getCoverSrc                   = getCoverSrc;
            vm.addToMyPublications           = addToMyPublications;
            vm.deletePublication             = deletePublication;
            vm.beginNewStudy                 = beginNewStudy;
            vm.resumeCourse                  = resumeCourse;
            vm.cancelCourse                  = cancelCourse;
            vm.editCourse                    = editCourse;
            vm.openPublication               = openPublication;
            vm.isReadable                    = isReadable;
            vm.showMainPublicationData       = showMainPublicationData;
            vm.showAdditionalPublicationData = showAdditionalPublicationData;
            vm.isPublication                 = isPublication;
            vm.isStudyGuide                  = isStudyGuide;
            vm.isSection                     = isSection;
            vm.isStudyCourse                 = isStudyCourse;
            vm.isVocabularyAssessment        = isVocabularyAssessment;
            vm.startVocabularyAssessment     = startVocabularyAssessment;
            vm.openCollection                = openCollection;
            vm.countItems                    = countItems;
            vm.isIndependentStudy            = isIndependentStudy;
            vm.showDifficulty                = swPublicationsService.showDifficulty;
            vm.isPersistDefaultAllowed       = isPersistDefaultAllowed;
            vm.isDownloadAvailable           = isDownloadAvailable;
            vm.isAuthorInTitle               = isAuthorInTitle;

            function _init () {
               initTemplate();

               vm.courseId = vm.publication.id || vm.publication.classId;
               vm.publicationData = {
                  courseId : vm.courseId,
                  type     : vm.publication.type,
                  name     : vm.publication.name
               };

               vm.isMainPublicationData = true;
               vm.isAddingToMyBooks = false;
               vm.isAuthor = _.isArray(vm.publication.userIds) ? vm.publication.userIds.indexOf(userId) !== -1 : false;
               vm.studyGuideExportConfig.isAuthor = vm.isAuthor;

               vm.isInvite = vm.detailsApi.publication.isInvited;
               vm.isEditInvitation = vm.detailsApi.publication.isEditInvitation;

               vm.isCourseActive = (vm.detailsApi.message && vm.detailsApi.message.studentConfirmationStatus === 'Accepted') ||
                  (!vm.detailsApi.publication.isInvited && !vm.detailsApi.publication.isCompleted) && !vm.detailsApi.isEditor;

               vm.isAuthorInReadMode = vm.isWideMedia && vm.isAuthor && !vm.detailsApi.isEditor && ( swUserService.getUser().editorRole || swUserService.getUser().adminRole);
               vm.editNotesLink = appUrlFragment + '#/reader/_id/' + vm.courseId;
               vm.editSyllabusLink = appUrlFragment + '#/developstudycourse/_id/' + vm.courseId;
               swOfflineModeService.addOnlineModeChangeListener(onOnlineStateChange);
            }

            function _destroy () {
               swOfflineModeService.removeOnlineModeChangeListener(onOnlineStateChange);
            }

            function isAuthorInTitle(publication) {
              return !swPublicationsService.isAuthorInBookTitle(publication.author, publication.name, publication.language);
            }

            function swLayout () {
               $scope.isWideMedia = !!swLayoutManager.context().media.wide;
            }

            function acceptInvitation (publication) {
               vm.detailsApi.acceptInvitation(publication)
                  .then(vm.detailsApi.closePublicationDetails());
            }

            function declineInvitation (publication) {
               vm.detailsApi.declineInvitation(publication)
                  .then(vm.detailsApi.closePublicationDetails());
            }

            function getCoverSrc (publication) {
               return swPublicationsService.getCoverPath(publication, 'extralarge', '#');
            }

            function addToMyPublications () {
               updateUserPublication(vm.publication, true)
                  .then(function () {
                     vm.detailsApi.publication.personal = true;
                  });
            }

            function deletePublication () {
               updateUserPublication(vm.publication, false)
                  .then(function () {
                     vm.detailsApi.publication.personal = false;
                     if (vm.detailsApi.isPublicationsPersonal) {
                        _.each(vm.detailsApi.publicationsView, function (publication, index) {
                           if (
                              index < vm.detailsApi.publicationsView.length &&
                              publication.id === (vm.publication._id || vm.publication.id)
                              ) {
                              vm.detailsApi.publicationsView.splice(index, 1);
                              vm.detailsApi.closePublicationDetails();
                           }
                        });
                     }
                  }, function () {
                     vm.detailsApi.closePublicationDetails();
                  });
            }

            function beginNewStudy () {
               vm.publicationDetailsTemplate = '<sw-begin-new-course publication-data="publicationData" details-api="detailsApi"></sw-begin-new-course>';
            }

            function resumeCourse () {
               vm.detailsApi.openPublication(vm.publication);
            }

            function cancelCourse () {
               vm.detailsApi.cancelStudyClass(vm.publication);
            }

            function editCourse () {
               swStudyCourseService.editCourse(vm.courseId);
            }

            function openPublication () {
               _openPublication(vm.publication);
            }

            function isReadable () {
               return vm.publication.type === 'Book' || vm.publication.type === 'StudyGuide' || !vm.publication.type;
            }

            function showMainPublicationData () {
               vm.isMainPublicationData = true;
            }

            function showAdditionalPublicationData () {
               vm.isMainPublicationData = false;
            }

            function isPublication (item) {
               return item.type && item.type === 'Book';
            }

            function isStudyGuide (item) {
               return item.type && item.type === 'StudyGuide';
            }

            function isSection (item) {
               return item.type && item.type === 'section item';
            }

            function isStudyCourse (publication) {
               return publication.type === 'StudyCourse' || publication.publicationType === 'StudyCourse' || (publication.type || '').replace(/\s/g, '') === 'StudyClass';
            }

            function isVocabularyAssessment (item) {
               return item.type && item.type === 'vocabulary assessment item';
            }

            function startVocabularyAssessment () {
               swVocabularyAssessmentService.startAssessment(swDirectVocabularyService, {wait: true});
            }

            function openCollection (publication) {
               vm.detailsApi.openPublication(publication);
               vm.detailsApi.closePublicationDetails();
            }

            function countItems (studyCourseItems) {
               return _.filter(studyCourseItems, vm.isPublication).length;
            }

            function isIndependentStudy () {
               return vm.detailsApi.publication.classType === Context.parameters.studyProjectConfig.studyClassTypeEnum.independentStudy;
            }

            function isPersistDefaultAllowed () {
               return userProfile.adminRole && !vm.detailsApi.isEditor;
            }

            function _openPublication(publication) {
               vm.detailsApi.openPublication(publication);
            }

            function updateUserPublication(publication, isPersonal) {
               return swUserPublicationService.updateUserPublication({
                  publicationId: publication.id || publication._id,
                  publicationType : publication.type,
                  personal: isPersonal
               });
            }

            function initTemplate() {
               vm.isMainPublicationData = true;
               switch ( vm.publication.type ) {
                  case "StudyClass":
                     vm.publicationDetailsTemplate = studyClassDetailsTemplate;
                     vm.labelKey = 'PublicationDetails.StudyProjectInfo.header.label';
                     getClassContent();
                     break;

                  case "StudyGuide":
                     vm.publicationDetailsTemplate = studyGuideDetailsTemplate;
                     vm.labelKey = 'PublicationDetails.StudyGuideInfo.header.label';
                     getGuideContent();
                     getRelatedPublications(true);
                     break;

                  case "Book":
                     vm.publicationDetailsTemplate = publicationDetailsTemplate;
                     vm.labelKey = 'PublicationDetails.BookInfo.header.label';
                     getBookInfo(vm.publication.id)
                        .then(function (_response) {
                           if (vm.isPersistDefaultAllowed()) {
                              vm.relatedConfig = _response.data;
                           }
                           else {
                              vm.relatedPublications = _response.data.relatedStudyGuides;
                           }
                           vm.publication.numberOfRelatedStudyGuides = _response.data.relatedStudyGuides.length;
                        });
                     break;

                  case "Collection":
                     vm.publicationDetailsTemplate = collectionDetailsTemplate;
                     vm.labelKey = 'PublicationDetails.Collection.header.label';
                     getCollectionInfo();
                     break;

                  default:
                     vm.publicationDetailsTemplate = studyCourseDetailsTemplate;
                     vm.labelKey = 'PublicationDetails.StudyCourseInfo.header.label';
                     getCourseContent();
                     break;
               }
            }

            function calculateEndCourse(startDate, readingTime, readingPerDay) {
               var dayTime = 86400000,
                  numberDays = Math.floor(readingTime / readingPerDay) || 0,
                  expectedDuration = numberDays * dayTime || 0,
                  endCourse;

               startDate = isNaN(startDate) ? new Date().getTime() : startDate;
               endCourse = startDate + expectedDuration;
               return new Date(endCourse).setHours(23, 59, 59, 999);
            }

            function getBookInfo() {
               return swPublicationsService.getBookInfo(vm.publication.id);
            }

            function getClassContent() {
               swStudyClassService.getStudyClassInfo(vm.publication.classId)
                  .then(function (response) {
                     var basedOnPublication = response.data.studyCourseInfo.course;
                     vm.relatedPublications = response.data.studyCourseInfo.details || [];
                     vm.publication.endCourse = calculateEndCourse(vm.publication.registeredAt, vm.publication.course.readingTime, vm.publication.expectedDailyStudy);
                     if (!vm.relatedPublications.length) {
                        if (basedOnPublication.type !== 'StudyCourse') {
                           vm.relatedPublications = [basedOnPublication];
                        }
                     }
                  });
            }

            function getCourseContent() {
               swStudyCourseService.getStudyCourse(vm.publication.id)
                  .then(function (response) {
                     vm.publication = _.extend(vm.publication, response.data);
                     vm.relatedPublications = response.data.studyCourseItems;
                  });
            }

            function getGuideContent() {
               swPublicationsService.getPublicationDetails(vm.publication.id, 'remote')
                  .then(function (data) {
                     vm.publication = _.extend(vm.publication, {
                        bookTitle: data.book.title,
                        bookAuthor: data.book.author,
                        notes: data.notes,
                        exercises: data.exercises,
                        paragraphSummary: data.paragraphSummary
                     });
                  });
            }

            function getRelatedPublications(isStudyGuide) {
               swPublicationsService.getRelatedPublications(vm.publication.id, false, isStudyGuide)
                  .then(function (response) {
                     vm.relatedPublications = response.data;
                     vm.publication.numberOfRelatedStudyGuides = response.data.length;
                  });
            }

            function getCollectionInfo() {
               swPublicationsService.searchCollectionItems(vm.publication.id)
                  .then(function (results) {
                     vm.relatedPublications = results;
                  });
            }

            function isDownloadAvailable () {
              return swPublicationsService.isFSAvailable();
            }

            function onOnlineStateChange (online) {
               vm.detailsApi.isOffline = !online;
            }

         }]
   });
});
