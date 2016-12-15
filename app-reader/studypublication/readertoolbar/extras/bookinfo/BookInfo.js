define([
   'module',
   'underscore',
   'swComponentFactory',
   'Context',
   'text!./BookInfo.html',
   'text!./searcheditors/SearchEditors-header.html',
   'less!./BookInfo',
   'less!./BookInfoThemeMixin'
], function (module, _, swComponentFactory, Context, template, searchEditorsHeader) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extrasApi   : '=',
         publication : '=',
         gotoLocator : '&'
      },
      controller: [
         '$scope',
         '$element',
         '$timeout',
         'swBookInfoService',
         'swContentProvider',
         'swReaderService',
         'swPublicationsService',
         'swApplicationToolbarService',
         'swValidationService',
         'swPopupService',
         'swManageStudyGuideEditorsService',
         'swUserService',
         'swNotificationService',
         'swManageBookInfoService',
         'swScrollFactory',
         'swOpenPublicationService',
         'swStudyPublicationService',
         'swUserPublicationService',
         function ($scope,
            $element,
            $timeout,
            swBookInfoService,
            swContentProvider,
            swReaderService,
            swPublicationsService,
            swApplicationToolbarService,
            swValidationService,
            swPopupService,
            swManageStudyGuideEditorsService,
            swUserService,
            swNotificationService,
            swManageBookInfoService,
            swScrollFactory,
            swOpenPublicationService,
            swStudyPublicationService,
            swUserPublicationService) {

            var vm = $scope;

            var searchEditorsPopup;
            var inactiveEditors             = [];
            var openedContent               = true;
            var openedDescription           = false;
            var openedStudyGuideDescription = false;
            var userId                      = swUserService.getUserId();

            vm.isAuthorInTitle = function(publication) {
               return !swPublicationsService.isAuthorInBookTitle(publication.author, publication.name, publication.language);
            };

            vm.relatedVisible     = false;
            vm.bookInfoViewConfig = {
               currentSelect : !vm.extrasApi.isFromClassEntered,
               disableAll    : vm.extrasApi.isFromClassEntered,
               persist       : true
            };

            vm.isTableOfContentsEmpty = function(toc) {
               return !toc || toc.length === 0;
            };

            vm.swInit = function () {
               vm.publicationInfo    = {};
               vm.editMode           = false;
               vm.editorsOnline      = [];
               vm.readersOnlineCount = 1;

               swContentProvider.addOnPublicationDetailsChangeListener(getBookInfo);
               swContentProvider.addOnExercisesChangeListener(getExercises);
               swContentProvider.addOnNotesChangeListener(updateNotesLength);
               swManageBookInfoService.addSetStudyGuideListener(setStudyGuide);
               swBookInfoService.saveBookInfo(swReaderService.getBookKey(), {
                  extrasTab: 'BookInfo'
               });
               swNotificationService.addNotificationListener('searchUsersWithActivity', _getEditorsActivityParams, changeEditorsActivity);
               swNotificationService.addNotificationListener('countUsersWithActivity', _getReadersActivityParams, changeReadersActivity);
               $timeout(getImmediateUsersActivity);
            };

            vm.swDestroy = function () {
               swContentProvider.removeOnPublicationDetailsChangeListener(getBookInfo);
               swContentProvider.removeOnExercisesChangeListener(getExercises);
               swContentProvider.removeOnNotesChangeListener(updateNotesLength);
               swManageBookInfoService.removeSetStudyGuideListener(setStudyGuide);
               swNotificationService.removeNotificationListener('searchUsersWithActivity');
               swNotificationService.removeNotificationListener('countUsersWithActivity');
            };

            // TODO: turn into a proper directive, get rid of index (as it will break if filter/sort is applied)
            /**
             *
             * @param {Object} tocItem
             * @param {number} index
             * @returns {boolean}
             */
            vm.checkForCurrentChapter = function checkForCurrentChapter(tocItem, index) {
               var publication = vm.publication;
               var isCurrentChapter = publication.currentChapterId === null && index === 0 ||
                  publication.currentChapterId === tocItem.id;

               var scroll;
               if (isCurrentChapter && publication.shouldScrollIntoView) {
                  scroll =  swScrollFactory.getParentScroll($element);
                  if (scroll && scroll.isActive()) {
                     scroll.scrollIntoViewIfNeeded($element[0].querySelectorAll('.toc-body li')[index]);
                  }
                  publication.shouldScrollIntoView = false;
               }
               return isCurrentChapter;
            };

            vm.toggleRelated = function () {
               vm.relatedVisible = !vm.relatedVisible;
            };

            vm.showDifficulty = swPublicationsService.showDifficulty;

            function getBookInfo(details) {
               details.book.category = _.capitalize(details.book.category);
               details.category = details.book.category;
               vm.publicationInfo = details;
               vm.bookThumbnailUrl = swPublicationsService.getCoverPath(details.book, 'large', '#');
               vm.extrasApi.editors = vm.extrasApi.editors || details.editors;
               vm.publicationInfo.book.readingTime = getReadingTime(details.book.wordsNumber);
               vm.publicationInfo.book.readingProgress = details.book.userPublication.readingProgress;
               vm.publicationInfo.book.readingDuration = details.book.userPublication.readingDuration;
               vm.publication._update({
                  tableOfContents: (details.tableOfContents || []).reduce(tocReducer, []).filter(function (el) {
                     return !!el.text;
                  })
               });

               if ( details.studyGuide ) {
                  vm.studyGuideThumbnailUrl = swPublicationsService.getCoverPath({id: details.book.id, cover: details.studyGuide.cover}, 'large');
               }

               function tocReducer(plainToc, el) {
                  var children = el.children || [];
                  delete el.children;
                  return plainToc.concat(el, children.reduce(tocReducer, []));
               }
            }

            // ui
            vm.isStudyGuide = function (publication) {
               return publication.studyGuide && publication.studyGuide.publicationType === 'StudyGuide';
            };

            vm.hasCover = function (bookinfo) {
               return bookinfo.coverUrl && bookinfo.coverUrl.indexOf('undefined') !== -1;
            };

            vm.showEditFields = function () {
               return vm.editMode;
            };

            vm.isEditor = function () {
               return swApplicationToolbarService.isEditor();
            };

            vm.isDownloadAvailable = function () {
              return swPublicationsService.isFSAvailable();
            };

            //edit functions
            vm.editData = {
               name : '',
               description : ''
            };

            var edit = function () {
               vm.editData.name = vm.publicationInfo.studyGuide.name;
               vm.editData.description = vm.publicationInfo.studyGuide.description || '';
               vm.editMode = true;
            };

            var save = function () {
               var saveData = {};
               swValidationService.setValidationMessagesEnabled(vm.form, true);
               if (vm.form.$valid) {
                  saveData.id = vm.publicationInfo.studyGuide.id;
                  saveData.name = vm.editData.name;
                  saveData.description = vm.editData.description && vm.editData.description.length !== 0 ? vm.editData.description : vm.publicationInfo.book.description;
                  //debugger;//service client - result is not used
                  swPublicationsService.saveStudyGuide(saveData, 'remote');
                  vm.publicationInfo.studyGuide.name = vm.editData.name;
                  vm.publicationInfo.studyGuide.description = saveData.description;
                  updateToolbarTitle(vm.editData.name, vm.extrasApi.editors);
                  if (inactiveEditors.length) {
                     removeEditors(inactiveEditors)
                        .then(function () {
                           inactiveEditors = [];
                        });
                  }
                  vm.editMode = false;
               }
            };

            var cancel = function () {
               updateToolbarTitle(vm.editData.name, vm.extrasApi.editors);
               vm.editMode = false;
            };

            var showEditButtons = function () {
               return !vm.editMode;
            };

            vm.editConfig = {
               edit : edit,
               save : save,
               cancel : cancel,
               showEditButtons : showEditButtons
            };

            vm.validateTitle = function () {
               return {
                  name: {
                     valid : vm.editData.name.length !== 0,
                     active : true
                  }
               };
            };

            vm.onTocItemClicked = function (item) {
               vm.publication._update({
                  currentChapterId: item.id
               });

               vm.gotoLocator({
                  locator: '#' + item.id
               });
            };

            vm.showDescription = function () {
               openedDescription = !openedDescription;
            };

            vm.isOpenedDescription = function () {
               return openedDescription;
            };

            vm.showStudyGuideDescription = function () {
               openedStudyGuideDescription = !openedStudyGuideDescription;
            };

            vm.isOpenedStudyGuideDescription = function () {
               return openedStudyGuideDescription;
            };

            vm.showContent = function () {
               openedContent = !openedContent;
            };

            vm.isOpenedContent = function () {
               return openedContent;
            };

            var parseExercises = function (exercises) {
               var response = {
                  essaysWordLimit : 0,
                  flashcards : 0,
                  numberExercises : 0,
                  numberQuizQusetions : 0
               };
               _.each(exercises, function (exercise) {
                  response.numberExercises += 1;
                  if (exercise.type === "EssayTask") {
                     response.essaysWordLimit += parseInt(exercise.wordsLimit, 10);
                  }
                  else if (exercise.testType === "Quiz") {
                     response.numberQuizQusetions += exercise.testQuestions ? exercise.testQuestions.length : exercise.testQuestionsCount;
                  }
                  else if (exercise.testType === "Flashcard") {
                     response.numberQuizQusetions += exercise.testQuestions ? exercise.testQuestions.length : exercise.testQuestionsCount;
                  }
               });
               return response;
            };

            var getExercises = function (exercises) {
               if (vm.publicationInfo.studyGuide &&
                  vm.publicationInfo.studyGuide.wordsNumber) {

                  var exerciseInfo = parseExercises(exercises);
                  var basicReadingTime = getReadingTime(vm.publicationInfo.studyGuide.wordsNumber);
                  var readingTime = recalculateReadingTime(basicReadingTime, exerciseInfo);

                  vm.publicationInfo.studyGuide.exercises = exerciseInfo.numberExercises;
                  vm.publicationInfo.studyGuide.readingTime = readingTime;
               }
            };

            var updateNotesLength = function (notes) {
               if (vm.publicationInfo.studyGuide) {
                  vm.publicationInfo.studyGuide.notes = notes.length;
               }
            };

            vm.isRemoveEditorAllowed = function (editor) {
               return vm.editMode && editor.editorStatus !== 'Creator' && editor.user.userId !== userId;
            };

            vm.searchEditors = function ($event) {
               if (inactiveEditors.length) {
                  removeEditors(inactiveEditors)
                     .then(function () {
                        inactiveEditors = [];
                        openSearchEditorPopup($event.target);
                     });
               }
               else {
                  openSearchEditorPopup($event.target);
               }
            };


            function getStudyGuideAuthor(editorsList) {
               var creator = _.findWhere(editorsList, {editorStatus: "Creator"});
               var authorLine = creator.user.firstName + ' ' +  creator.user.lastName;
               _.each(editorsList, function (editor) {
                  if (editor.editorStatus !== "Creator") {
                     authorLine += ', ' + editor.user.firstName + ' ' +  editor.user.lastName;
                  }
               });
               return authorLine;
            }

            function updateToolbarTitle(title, editorsList) {
               var author = getStudyGuideAuthor(editorsList);
               swUserPublicationService.updateTitleLastRecentItem(title, author);
            }

            function openSearchEditorPopup(element) {
               vm.headerFn = {
                  done : function () {
                     if (searchEditorsPopup) {
                        searchEditorsPopup.hide();
                        persistEditorsStatus(vm.extrasApi.editors, 'Active');
                        return false;
                     }
                     return false;
                  }
               };

               if ( !searchEditorsPopup || searchEditorsPopup.isHidden() ) {
                  searchEditorsPopup = swPopupService.show({
                     scope           : vm,
                     layout          : {},
                     target          : element,
                     backdropVisible : true,
                     customClass     : 'search-editors-popup',
                     header          : searchEditorsHeader,
                     content         : '<sw-search-editors extras-api="extrasApi"></sw-search-editors>',
                     footer          : ''
                  });

                  searchEditorsPopup.promise.then(function () {
                     persistEditorsStatus(vm.extrasApi.editors, 'Active');
                  });
               }
            }

            vm.deactivateEditor = function (editor) {
               var inactiveId = editor.user.userId;
               inactiveEditors.push(editor);
               vm.extrasApi.editors = _.filter(vm.extrasApi.editors, function (_editor) {
                  return _editor.user.userId !== inactiveId;
               });
            };

            function removeEditors(editors) {
               return persistEditorsStatus(editors, 'Inactive');
            }

            function persistEditorsStatus(editorsList, status) {
               updateToolbarTitle(vm.editData.name, vm.extrasApi.editors);
               var editorIds = getEditorIds(editorsList);
               var bookId = swReaderService.getBookKey()._id;
               return swManageStudyGuideEditorsService.persistStudyGuideEditorsStatus(bookId, editorIds, status, '');

               function getEditorIds(editors) {
                  return _.map(editors, function (editor) {
                     return editor.user.userId;
                  });
               }
            }

            function changeEditorsActivity (activity) {
               $timeout(function () {
                  vm.editorsOnline = [];
                  if ( !activity ) {
                     return false;
                  }
                  _.each(activity, function (activeUser) {
                     if ( activeUser.actual && !_.some(vm.editorsOnline, {userId: activeUser.user.userId}) ) {
                        vm.editorsOnline.push(activeUser.user);
                     }
                  });
               });
            }

            function _getEditorsActivityParams () {
               return _activityParams('Study Guide Editing', false);
            }

            function changeReadersActivity (num) {
               $timeout(function () {
                  if ( !num ) {
                     vm.readersOnlineCount = 1;
                     return false;
                  }
                  vm.readersOnlineCount = num;
               });
            }

            function _getReadersActivityParams () {
               return _activityParams('Book Reading', true);
            }

            function _activityParams (_activityName, _isActive) {
               var entityId = _.trim(vm.publicationInfo.currentStudyGuideId);
                   entityId = entityId.length && entityId || vm.publicationInfo.id;

               return {
                  activity : {
                     name            : _activityName,
                     relatedEntityId : entityId
                  },
                  contextActivity : null,
                  activeOnly      : _isActive
               };
            }

            function getImmediateUsersActivity () {
               swNotificationService.ping();
            }

            function setStudyGuide (options) {
               var currentStudyItem = swStudyPublicationService.getCurrentStudyItem();
               var locator = _.get(currentStudyItem, 'readingPosition.fragmentId', '');
               var _options = {
                  reload      : false,
                  studyItemId : options.id,
                  readingPosition: currentStudyItem.readingPosition
               };
               swOpenPublicationService.openPublication(options.id, locator, _options);
            }

            function getReadingTime (wordsCount) {
               return Math.round(wordsCount / 140) * 60000;
            }

            function recalculateReadingTime (basicReadingTime, exerciseInfo) {
               return basicReadingTime +
                  Context.parameters.timeExercises.quizQuestion * exerciseInfo.numberQuizQusetions +
                  Context.parameters.timeExercises.flashcard * exerciseInfo.flashcards +
                  Context.parameters.timeExercises.essay * Math.round(exerciseInfo.essaysWordLimit / 10);
                  // Context.parameters.timeExercises.microJournaling * vm.publicationInfo.studyGuide.exercises.microJournaling;
            }
         }
      ]
   });
});