define([
   'module',
   'jquery',
   'underscore',
   'swComponentFactory',
   'Context',
   'swAppUrl',
   'text!./ManagePublications.html',
   'text!./PublicationViewTemplate.html',
   'text!./StudyViewTemplate.html',
   'less!./ManagePublications.less'
], function (module, $, _, swComponentFactory, Context, swAppUrl, template, publicationViewTemplate, studyViewTemplate) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      isolatedScope : {
         studyCourseData : '='
      },
      controller : [
         '$scope',
         '$q',
         '$timeout',
         'swUnifiedSettingsService',
         'swStudyCourseService',
         'swPublicationsService',
         'swContentProvider',
         'swOpenPublicationService',
         'swPopupService',
         'swStudyClassService',
         'swApplicationToolbarService',
         'swLongRunningOperation',
         'swUserService',
         'swUserPublicationService',
         'swLazyLoadingHelper',
         'swApplicationScroll',
         'swManagePublicationsToolbarService',
         'swBeginNewCourseService',
         'swRecentBooksService',
         'swOfflineModeService',
         'swAgentService',
         'swI18nService',
      function (
         $scope,
         $q,
         $timeout,
         swUnifiedSettingsService,
         swStudyCourseService,
         swPublicationsService,
         swContentProvider,
         swOpenPublicationService,
         swPopupService,
         swStudyClassService,
         swApplicationToolbarService,
         swLongRunningOperation,
         swUserService,
         swUserPublicationService,
         swLazyLoadingHelper,
         swApplicationScroll,
         swManagePublicationsToolbarService,
         swBeginNewCourseService,
         swRecentBooksService,
         swOfflineModeService,
         swAgentService,
         swI18nService
         ) {
            var vm = $scope,
                user = swUserService.getUser(),
                userId = user.userId,
                courseButtonLabels = [
                   'End',
                   'Cancel',
                   'Leave'
                ],
                userRoles = Context.parameters.studyProjectConfig.userRoleInStudyClass;

         /* --- api --- */
            vm.modesList = [];
            vm.studyActivities = [];
            vm.currentModeData = {};

            vm.visiblePublicationsCount = 0;
            vm.fakePublications = new Array(+Context.parameters.fakePublicationsSet.default);
            vm.isStudyExists = true;
            vm.isOffline = !swOfflineModeService.isOfflineModeEnabled() && swOfflineModeService.isOffline();

            vm.filterText = '';

            vm.isEditor = swApplicationToolbarService.isEditor();

            vm.changeMode  = changeMode;
            vm.resetSearch = resetSearch;
            vm.applyFilter = applyFilter;

            vm.openPublication   = openPublication;
            vm.openPublicationDetails  = openPublicationDetails;
            vm.showDifficulty = swPublicationsService.showDifficulty;

            vm.setMenuItem = setMenuItem;

            vm.createStudyProject = createStudyProject;
            vm.cancelStudyClass = cancelStudyClass;

            vm.acceptInvitation = acceptInvitation;
            vm.declineInvitation = declineInvitation;
            vm.authorInName = authorInName;
            vm.isMyMaterials = isMyMaterials;
            vm.showMyBookCornerMarker = showMyBookCornerMarker;
            vm.timeTransform = timeTransform;
            /* === impl === */
            $scope.swInit = swInit;
            $scope.swSubmachine.$on$end$enter = _onDestroy;

            var noop = _.noop;
            var libraryUpdateEnd      = noop;
            var updateRequested       = noop;
            var searchStudyClassesEnd = noop;

            //usually couldn't fired, because dump loading started before library rendered
            swAgentService.off('dump_loading_start');
            swAgentService.on('dump_loading_start', function() {
               libraryUpdateEnd = swLongRunningOperation.start('libraryUpdate');
            });
            swAgentService.off('dump_loading_progress');
            swAgentService.on('dump_loading_progress', function(/*progress*/) {
               if (libraryUpdateEnd === noop) {
                  libraryUpdateEnd = swLongRunningOperation.start('libraryUpdate');
               }
            });
            swAgentService.off('dump_loading_end');
            swAgentService.on('dump_loading_end', updateContent);

            function updateContent() {
               searchPublications(true);
               libraryUpdateEnd();
               libraryUpdateEnd = noop;
               updateRequested = noop;
            }

            swAgentService.off('update_received');
            swAgentService.on('update_received', function(args) {
               var data = args[0];
               var dbName = args[1];

               if (dbName === swAgentService.dbNames.userRW) {
                  if (!swUserPublicationService.getLastRecentItem().name) {
                     swUserPublicationService.getRecentBooks();
                  }
               }

               if (needUpdate(dbName, data.docs) && updateRequested === noop) {
                  updateRequested = $timeout(updateContent, 30000);
               }

               function needUpdate(dbName, docs) {
                  var inLibrary = vm.swSubmachine.context().confParams()._type === undefined;
                  var curTabName = (swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedMode') || {}).title;
                  var libTab = !curTabName || curTabName === 'Library';
                  var studyTab = !curTabName || curTabName === 'Study';


                  if (dbName === swAgentService.dbNames.public && inLibrary) {
                     return isContentUpdated('pub', docs) && needLibraryUpdate(docs) && libTab ||
                         isContentUpdated('course', docs) && studyTab;
                  }

                  if (dbName === swAgentService.dbNames.userRW && inLibrary && libTab) {
                     return isContentUpdated('books', docs);
                  }

                  //if (dbName === swAgentService.dbNames.userRW && inLibrary && studyTab) {
                  //   return isContentUpdated('courses', docs);
                  //}
                  return false;
               }

               function isContentUpdated(prefix, docs) {
                  return docs.filter(function(doc) {
                     return doc._id.indexOf(prefix) > -1;
                  }).length > 0;
               }

               function needLibraryUpdate(docs) {
                  return docs.filter(function(doc) {
                     return ['book', 'collection', 'syllabus'].indexOf(doc.pubType) > -1;
                  }).length > 0;
               }
            });

            var publicationDetailsPopup  = false,
                PUBLICATIONS_SET,
                currentLanguage,
                currentCategory,
                userRole = vm.isEditor ? 'editor' : 'reader';

            vm.modesList = [
               {
                  index : 0,
                  title : "Library",
                  personalPublications : false,
                  roles : ['editor', 'reader']
               },
               {
                  index : 1,
                  title : "My Materials",
                  personalPublications : true,
                  roles : ['editor']
               },
               {
                  index : 2,
                  title : "My Books",
                  personalPublications : true,
                  roles : ['reader']
               },
               {
                  index : 3,
                  title : "Study",
                  classes : true,
                  roles : ['reader']
               }
            ];

            function swInit() {
               resetPublicationsSet();

               $scope.publicationViewTemplate = publicationViewTemplate;
               $scope.studyViewTemplate = studyViewTemplate;

               var data = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedMode');
               vm.currentModeData = vm.modesList[(data || { index: -1}).index];
               if (!vm.currentModeData || !setMenuItem(vm.currentModeData)) {
                  vm.currentModeData = _.first(vm.modesList);
               }

               vm.filterText = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedFilter');

               currentCategory = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedPublicationGroupName');
               currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');

               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedMode', onCurrentModeChange);
               swOfflineModeService.addOnlineModeChangeListener(onOnlineStateChange);
               swPublicationsService.getFileListByType('local').then(updatePublicationsSet, updatePublicationsSet);
            }

            function _onDestroy() {
               swLazyLoadingHelper.unregister(swApplicationScroll.getScroll());
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedMode', onCurrentModeChange);
               swOfflineModeService.removeOnlineModeChangeListener(onOnlineStateChange);
            }

            function setMenuItem (mode) {
               return _.contains(mode.roles, userRole);
            }

            function changeMode(index)
            {
               //#2604 group collection books in 'my books' handle `back` action
               if (index === 0 && vm.currentModeData.collectionId && vm.currentModeData.personalPublications) {
                  swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedMode', vm.modesList[2]);
               }
               else {
                  swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedMode', vm.modesList[index]);
               }
            }

            function resetSearch()
            {
               vm.filterText = '';
               swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedFilter', '');
               searchPublications();
            }

            function getThumbnailByPublication(publication) {
               return swPublicationsService.getCoverPath(publication, 'medium');
            }

            function isStudyGuideEditor(publication, userId) {
               return publication.userIds.indexOf(userId) !== -1;
            }

            function openPublication(publication) {
               switch (publication.type) {
                  case 'Book':
                     updateRecentBook(publication);
                     if (vm.isEditor) {
                        swContentProvider.createStudyGuide(publication).then(function(response) {
                           initiateStudy({id : response.data});
                        });
                     }
                     else {
                        initiateStudy(publication);
                     }
                     break;
                  case 'StudyGuide':
                     if(isStudyGuideEditor(publication, userId) || !vm.isEditor) {
                        initiateStudy(publication);
                        updateRecentBook(publication);
                     }
                  break;

                  case 'Collection':

                     vm.currentModeData = {
                        collection       : true,
                        collectionId     : publication.id,
                        collectionName   : publication.name,
                        collectionAuthor : publication.author,
                        personalPublications: vm.currentModeData.personalPublications || false,
                        roles: []
                     };
                     searchPublications();
                  break;

                  case 'StudyCourse':
                     if (vm.isEditor && publication.userId === userId) {
                        updateRecentBook(publication);
                        swStudyCourseService.editCourse(publication.id);
                     }
                     else {
                        openPublicationDetails(publication);
                     }
                  break;

                  case 'StudyClass':
                      if ( !publication.isInvited ) {
                         updateRecentBook(publication);
                         openStudyClass(publication);
                      }
                  break;
               }
            }

            function openPublicationDetails(publication, $event) {
               if ($event) {
                  $event.stopPropagation();
               }

               var scope = $scope.$new(true);

               scope.detailsApi = {
                  publication             : publication,
                  publicationsView        : vm.publications,
                  isEditor                : vm.isEditor,
                  openStudyClass          : openStudyClass,
                  openPublication         : openPublication,
                  closePublicationDetails : closePublicationDetails,
                  cancelStudyClass        : cancelStudyClass,
                  isPublicationsPersonal  : vm.currentModeData.personalPublications,
                  acceptInvitation        : acceptInvitation,
                  declineInvitation       : declineInvitation
               };

               if (!publicationDetailsPopup || publicationDetailsPopup.isHidden()) {
                  publicationDetailsPopup = swPopupService.show({
                     content : '<sw-publication-details details-api="detailsApi"></sw-publication-details>',
                     header: '<div style="height:44px" class="popup-injectable-template"></div>',
                     scope : scope,
                     backdropVisible: true,
                     customClass: 'publication-details-popup new-course defaultPopup',
                     layout: {
                        my: 'CC'
                     }
                  });
               }
            }

            function openStudyClass(studyClass) {
               var inStudyActivities = _.findWhere(vm.studyActivities, {
                  classId: studyClass.classId
               });
               if (inStudyActivities) {
                  swOpenPublicationService.beginUserStudy(inStudyActivities.currentStudyItemId, '', {
                     isStudyCourse       : inStudyActivities.publicationType === 'StudyCourse',
                     _classId            : inStudyActivities.classId,
                     type                : 'StudyClass'
                  });
               }
               else {
                  swStudyClassService.resumeCourse({
                     classId: studyClass.classId
                  });
               }
            }

            function cancelStudyClass (publication) {
               var message;
               if ( isMasterTeacher(publication.teachers) ) {
                  message = swI18nService.getResource('ManagePublications.infoBox.studyClass.cancel.label', publication.name);
                  showConfInfoBox(message, cancelClass);
               }
               else if ( isAddedTeacher(publication.teachers) ) {
                  swStudyClassService.persistClassTeachersStatus(userId, publication.classId, [userId], 'Declined', '')
                      .then(function () {
                         publication.teachers = _.filter(publication.teachers, function (_t) {
                            return _t.userId !== userId;
                         });
                      });
               }
               else {
                  message = swI18nService.getResource('ManagePublications.infoBox.studyClass.leave.label', publication.name);
                  showConfInfoBox(message, leaveClass);
               }

               function leaveClass () {
                  swStudyClassService.persistClassStudentStatus(userId, publication.classId, [userId], 'Declined', '')
                     .then(function () {
                        closePublicationDetails();
                        vm.currentClasses = filterAbsentClasses(vm.currentClasses, publication.classId);
                        checkIfStudyExists();
                     });
               }

               function cancelClass () {
                  swStudyClassService.cancelStudyClass(publication.classId, '')
                     .then(function () {
                        vm.currentClasses = filterAbsentClasses(vm.currentClasses, publication.classId);
                        checkIfStudyExists();
                     });
               }
            }

            function showConfInfoBox (_message, _callback) {
               swPopupService.showInfoBox({
                  content : '<span>' + _message + '</span>',
                  buttons : [{
                     name  : 'yes',
                     click : function () {
                        if ( _callback && typeof _callback === 'function' ) {
                           _callback();
                        }
                     }
                  },
                  {
                     name  : 'cancel',
                     click : function () {}
                  }],
                  customClass: 'publication-details-confirmation-popup'
               });
            }

            function applyFilter () {
               swLongRunningOperation.suspend();
               swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedFilter', vm.filterText);
               searchPublications();
               swLongRunningOperation.resume();
            }

            function loadMore () {
               vm.visiblePublicationsCount += PUBLICATIONS_SET;

               if (vm.visiblePublicationsCount >= vm.publications.length) {
                  return $q.reject();
               }
               return $q.when(true);
            }

            function onCurrentModeChange(settings) {
               vm.currentModeData = settings.value;
               updatePublicationsSet();
            }

            function onCurrentLanguageChange(setting) {
               currentLanguage = setting.value;
               searchPublications();
            }

            function onCurrentCategoryChange(setting) {
               currentCategory = setting.value;
               searchPublications();
            }

            function onOnlineStateChange(online) {
               vm.isOffline = !swOfflineModeService.isOfflineModeEnabled() && !online;
               //searchPublications();
            }

            function onSearchStudyClasses(response) {
               //TODO replace by search only classes
               searchStudyClassesEnd = swLongRunningOperation.start('searchStudyClasses');
               swRecentBooksService.getRemoteRecentBooks()
                  .then(function (recentBooks) {
                     vm.studyActivities = recentBooks.studyActivities || [];

                     _.each(_.map(response.data, _prepareStudyClass), function (classItem) {
                        var membership = _getMembership(classItem) || {};
                        if ( membership.teacherConfirmationStatus === 'Requested' && membership.studentConfirmationStatus === 'Accepted' ) {
                           return false;
                        }

                        if ( membership.teacherConfirmationStatus === 'Accepted' && membership.studentConfirmationStatus === 'Requested' ) {
                           classItem.isInvited = true;
                           vm.invitedClasses.push(classItem);
                        }
                        else if ( classItem.readingProgress > 90 ) {
                           classItem.isCompleted = true;
                           vm.completedClasses.push(classItem);
                        }
                        else {
                           vm.currentClasses.push(classItem);
                        }
                     });

                     function _getMembership (publication) {
                        var _teacher = _getCurrentData(publication.teachers, 'userId');
                        return !!_teacher ? _teacher : _getCurrentData(publication.membership, 'studentId');
                     }

                     function _getCurrentData (_arr, _prop) {
                        return _.find(_arr, function (item) {
                           return item[_prop] === userId;
                        });
                     }

                     function getCourseButtonLabel (publication) {
                        if ( isMasterTeacher(publication.teachers) ) {
                           return publication.class.classType === 'Independent Study' ? courseButtonLabels[0] : courseButtonLabels[1];
                        }
                        else {
                           return courseButtonLabels[2];
                        }
                     }

                     function _prepareStudyClass(publication) {
                        var progress = countPublicationProgress(publication.class.readingProgress, publication.course.readingTime);
                        var classInRecent = _.find(vm.studyActivities, {classId: publication.class.classId}) || {};

                        return _.extend(publication.class, {
                           type             : 'StudyClass',
                           author           : publication.teachers && publication.teachers.length ?
                              publication.teachers[0].firstName + ' ' + publication.teachers[0].lastName :
                              '',
                           students         : publication.membership.length + publication.teachers.length,
                           expectedDuration : publication.class.expectedDuration,
                           teachers         : publication.teachers,
                           courseId         : publication.course.id,
                           course           : publication.course,
                           membership       : publication.membership,
                           buttonLabel      : getCourseButtonLabel(publication),
                           isSelfStudy      : publication.class.classType === 'Independent Study',
                           completedTime    : progress.completedTime,
                           remainingTime    : progress.remainingTime,
                           lastReadingTime  : classInRecent.lastReadingTime
                        });
                     }
                     checkIfStudyExists();
                     searchStudyClassesEnd();
                  });
            }

            function isMyMaterials() {
               return vm.currentModeData.personalPublications && vm.currentModeData.roles[0] === 'editor';
            }

            function searchPublications (dontReset) {
               swApplicationScroll.preventScrollHandling();
               vm.visiblePublicationsCount = PUBLICATIONS_SET;
               if (!dontReset) {
                  resetPublicationsSet();
               }

               if ( vm.currentModeData.collection ) {
                  swPublicationsService.searchCollectionItems(vm.currentModeData.collectionId, vm.currentModeData.personalPublications)
                  .then(convertPublicationsViewData)
                  .then(_preparePublications);
               }
               else if (_.has(vm.currentModeData, 'personalPublications')) {
                  var _data = vm.currentModeData.personalPublications;
                  if (isMyMaterials()) {
                     swPublicationsService.searchPublications(vm.filterText, 0, currentLanguage, '', '', _data)
                        .then(function(publications) {
                           publications = _.filter(publications, function(publication) {
                              return publication.type !== 'Book';
                           });
                           return publications;
                        })
                        .then(convertPublicationsViewData)
                        .then(_preparePublications);
                  }
                  else {
                     swPublicationsService.searchPublications(vm.filterText, 0, currentLanguage, '', currentCategory, _data)
                     .then(convertPublicationsViewData)
                     .then(_preparePublications);
                  }
               }
               else if ( vm.currentModeData.classes ) {
                  swStudyClassService.searchStudyClasses().then(onSearchStudyClasses);
               }

               _.defer(function() {
                  swApplicationScroll.resumeScrollHandling();
                  swApplicationScroll.resetScroll();
               });
            }

            function _preparePublications(publications) {
               _prepareLazyLoading(_.map(_filterHiddenPublications(publications), _preparePublication));

               function _filterHiddenPublications (publications) {
                  return !vm.isEditor && _.filter(publications, function (_p) {
                     return _p.type !== 'StudyGuide';
                  }) || publications;
               }

               function _preparePublication(publication) {
                  var res = _.extend({}, publication);
                  res._thumbnail = getThumbnailByPublication(publication);
                  res.category   = res.category === 'StudyGuide' ? 'Book Notes' : res.category;
                  return res;
               }

               function _prepareLazyLoading (publications) {
                  if (swAppUrl.params.mode && swAppUrl.params.mode === 'search') {
                     swManagePublicationsToolbarService.showPopup();
                  }

                  vm.publications = publications;
                  swLazyLoadingHelper.unregister(swApplicationScroll.getScroll());
                  swLazyLoadingHelper.register(swApplicationScroll.getScroll(), {
                     next: loadMore,
                     rift: 500
                  });
               }
            }

            function updateRecentBook(publication) {
               if (publication.type === 'StudyCourse') {
                  return;
               }

               var title   = publication.name,
                   author  = publication.author;

               if (publication.type === 'StudyGuide') {
                  title    = publication.bookTitle || title;
                  author   = publication.bookAuthor || author;
               }
               swUserPublicationService.updateTitleLastRecentItem(title, author);
            }

            function initiateStudy (publication) {
               var classId;
               var id = publication && (publication.currentStudyGuideId || publication.defaultStudyGuideId || publication.id);

               if ( vm.isEditor ) {
                  swOpenPublicationService.openPublication(id);
               }
               else {
                  beginUserStudy(id, publication.type, classId, publication.type);
               }
            }

            function formatTime(value)
            {
               if ( typeof value === 'string' )
               {
                  return false;
               }
               var _hours = Math.floor(value / 60),
                   _minutes = Math.round(value - _hours * 60);

               _minutes = _minutes < 10 ? ('0' + _minutes) : _minutes;

               return _hours + ':' + _minutes;
            }

            function convertPublicationsViewData (publications)
            {
               return _.map(publications, function (item) {
                     if (item.class)
                     {
                        var time = item.course.wordsNumber / 140;
                        item.course.duration = formatTime(time, 'HH:mm');
                     }
                     return item;
                  });
            }

            function beginUserStudy (publication, type, classId, publicationType) {
               swOpenPublicationService.beginUserStudy(publication, publication.readingPosition, {
                  isStudyCourse       : publicationType === 'StudyCourse',
                  type                : type,
                  classId             : classId
               });
            }

            function closePublicationDetails ()
            {
               if (publicationDetailsPopup)
               {
                  publicationDetailsPopup.hide();
               }
            }

            function publicationsPerPage() {
               var block = $('.publication-item'),
                   elementsPerLine;

               elementsPerLine = (function () {
                  var firstLineBlocks = [];

                  block.each(function (index, item) {
                     if (index === 0 || firstLineBlocks[index - 1] && firstLineBlocks[index - 1].offsetTop === item.offsetTop) {
                        firstLineBlocks.push(block[index]);
                     }
                  });

                  return firstLineBlocks.length;
               })();

               return elementsPerLine * 4;
            }

            function isMasterTeacher (teachers) {
               return _isUserInArrayByRole(teachers, userRoles.teacher);
            }

            function isAddedTeacher (teachers) {
               return _isUserInArrayByRole(teachers, userRoles.teacherAndStudent);
            }

            function _isUserInArrayByRole (_array, _role) {
               return _.some(_array, function (_u) {
                  return _u.userId === userId && _u.role === _role;
               });
            }

            function createStudyProject () {
               swBeginNewCourseService.showPopup();
            }

            function countPublicationProgress (progressInPercents, timeInMs) {
               var completedTime = ( progressInPercents * timeInMs ) / 100,
                   remainingTime = timeInMs - completedTime;

               return {
                  completedTime : completedTime,
                  remainingTime : remainingTime
               };
            }

            function acceptInvitation (studyClass) {
               return persistInvitationStatus(studyClass, 'Accepted')
                   .then(function () {
                     studyClass.isInvited = false;
                     vm.currentClasses.push(studyClass);
                   });
            }

            function declineInvitation (studyClass) {
               return persistInvitationStatus(studyClass, 'Declined');
            }

            function persistInvitationStatus (studyClass, status) {
               return swStudyClassService.persistClassStudentStatus(userId, studyClass.classId, [userId], status, '')
                         .then(function () {
                            vm.invitedClasses = filterAbsentClasses(vm.invitedClasses, studyClass.classId);
                         });
            }

            function resetPublicationsSet () {
               vm.publications     = [];
               vm.invitedClasses   = [];
               vm.currentClasses   = [];
               vm.completedClasses = [];
            }

            function authorInName(publication) {
               return swPublicationsService.isAuthorInBookTitle(publication.author, publication.name, currentLanguage);
            }

            function filterAbsentClasses (classesArr, absentClassId) {
               return _.filter(classesArr, function (_class) {
                  return _class.classId !== absentClassId;
               });
            }

            function updatePublicationsSet () {
               $timeout(function() {
                  PUBLICATIONS_SET = vm.visiblePublicationsCount = publicationsPerPage();
                  searchPublications();
               });
            }

            function showMyBookCornerMarker(publication) {
               return publication.personal && !vm.isEditor;
            }

            function checkIfStudyExists () {
               vm.isStudyExists = vm.invitedClasses.length + vm.currentClasses.length + vm.completedClasses.length > 0;
            }

            function timeTransform (time) {
               return Math.round(time / 3600000 * 10) / 10; 
            }
         }
      ]
   });
});
