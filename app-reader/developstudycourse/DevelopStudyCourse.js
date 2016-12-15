define([
   'swComponentFactory',
   'module',
   'underscore',
   'Context',
   'text!./DevelopStudyCourse.html',
   'less!./DevelopStudyCourse'
], function (swComponentFactory, module, _, Context, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope : {
         readingApi : '='
      },
      controller: [
         '$q',
         '$window',
         'swPublicationsService',
         'swStudyCourseService',
         'swUnifiedSettingsService',
         'swDevelopStudyCourseService',
         'swValidationService',
         'swReaderService',
         'swUserPublicationService',
         'swUserService',
         'swUtil',
         'swScrollFactory',
         'swLazyLoadingHelper',
         function (
            $q,
            $window,
            swPublicationsService,
            swStudyCourseService,
            swUnifiedSettingsService,
            swDevelopStudyCourseService,
            swValidationService,
            swReaderService,
            swUserPublicationService,
            swUserService,
            swUtil,
            swScrollFactory,
            swLazyLoadingHelper,

            /* jshint unused: true */
            swComponentAugmenter,
            $scope,
            $element
            ) {
            var vm = $scope;
            var studyCourseId       = vm.swSubmachine.context().confParams()._id,
                currentLanguage      = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage'),
                currentCategory      = '',
                contentType          = '',
                textObj              = {},
                librarySettings      = {},
                userId               = swUserService.getUser().userId,
                index,
                topCourseItem,
                topCourseItemHeight;

            vm.sectionData = {};
            vm.studyCourse = {};
            vm.itemData    = {};
            vm.editMode    = {};
            vm.filter      = { text: '' };
            vm.selected    = { item: -1 };
            vm.editable    = { item: -1 };
            vm.filter      = {};

            vm.publications         = [];
            vm.studyCourseViewItems = [];
            vm.categories           = [];
            vm.publicationsOrder    = [
               'difficulty'
            ];

            vm.swApplicationScrollType = 'NONE';

            vm.toolbarVisible       = false;
            vm.isCollectionExpanded = false;

            vm.onChangeSize = function (size) {
               swUnifiedSettingsService.setSetting('ResizeColumnSettings', 'DevelopStudyCourse', size);
               vm.startResizePosition = swUnifiedSettingsService.getSetting('ResizeColumnSettings', 'DevelopStudyCourse');
            };
            vm.startResizePosition = swUnifiedSettingsService.getSetting('ResizeColumnSettings', 'DevelopStudyCourse');

            var scroll;

            vm.isAuthorInTitle = function (item) {
               return !swPublicationsService.isAuthorInBookTitle(item.author, item.name);
            };

            vm.swInit = function () {
               var collapseNestedCourses = true;
               studyCourseId = vm.swSubmachine.context().confParams()._id;
               swStudyCourseService.getStudyCourse(studyCourseId, collapseNestedCourses)
                .then(function (resp) {
                     vm.studyCourse = resp.data;
                     vm.studyCourseViewItems = resp.data.studyCourseItems.slice(0);
                     vm.studyCourse.disabled = true;
                   persistNestedListView();

                     swReaderService.setMetadata(vm.studyCourse);

                     vm.studyCourse.studyCourseItems = _.map(vm.studyCourse.studyCourseItems,
                       function (item) {
                           vm.categories.push(item.category);
                           vm.selected.item = 0;

                          if (item.id && item.type) {
                             var itemObj = {
                                id              : item.id,
                                bookId          : item.bookId,
                                studyGuideId    : item.studyGuideId,
                                name            : item.name,
                                difficulty      : item.difficulty,
                                wordsCount      : item.wordsCount,
                                author          : item.author,
                                studyGuideAuthor : item.studyGuideAuthor,
                                studyGuideName  : item.studyGuideName,
                                type            : item.type
                             };

                              if ( item.paragraphId ) {
                                _.extend(itemObj, {
                                   paragraphId          : item.paragraphId,
                                   finishingParagraphId : item.finishingParagraphId
                                });
                             }

                             return itemObj;
                          }

                          return item;
                       });

                     _.extend(vm.studyCourse, {
                        difficulty  : vm.studyCourse.difficulty || 0,
                        readingTime : vm.studyCourse.readingTime || 0
                   });

                   topCourseItem  = $window.document.getElementById('course-item-main');
                   if ( topCourseItem ) {
                      topCourseItemHeight = topCourseItem.offsetHeight;
                   }
                     _.each(vm.studyCourseViewItems, function (item, index) {
                      calculatePublicationsReadingTime(item, index);
                   });
                   countBooksCumulativeTime();
                });

               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
               swDevelopStudyCourseService.addEditItemListener(onItemEdit);
               storeLibraryFilteringSettings();

               _.defer(function() {
                  scroll = swScrollFactory.getParentScroll($element.find('.book-list'));
                  if (scroll.baron) {
                     scroll.baron[0].on('resize', function() {
                        _.result(scroll, '_onScroll');
                     });
                  }
                  //debugger;//service client - tested
                  _reloadPublication(currentLanguage, contentType, currentCategory);
               });

            };

            vm.showDifficulty = swPublicationsService.showDifficulty;

            vm.swSubmachine.$on$end$enter = function () {
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
               swDevelopStudyCourseService.removeEditItemListener(onItemEdit);
               restoreLibraryFilteringSettings();
               swLazyLoadingHelper.unregister(scroll);
            };

            //edit study course function
            var editCourseData = {};
            var editCourse = function(){
               editCourseData = _.clone(vm.studyCourse);
               vm.studyCourse.disabled = false;
            };

            var saveCourse = function() {
               if ( vm.form.$valid ) {
                  var defaulCourseDescription = 'created by ' + vm.studyCourse.author;
                  vm.studyCourse.disabled = true;
                  vm.studyCourse.description = vm.studyCourse.description.length !== 0 ?
                                               vm.studyCourse.description :
                                               defaulCourseDescription;
                persistStudyCourse();
              }
            };

            var cancelCourse = function() {
               vm.studyCourse = editCourseData;
               vm.studyCourse.disabled = true;
            };

            var showEditButtons = function() {
               return vm.studyCourse.disabled;
            };

            vm.editStudyCourseConfig = {
              edit              : editCourse,
              save              : saveCourse,
              cancel            : cancelCourse,
              showEditButtons   : showEditButtons
            };

            vm.editStudyCourseData = function () {
               swValidationService.setValidationMessagesEnabled(vm.form, true);

               if ( vm.form.$valid && !vm.studyCourse.disabled ) {
                  vm.studyCourse.disabled = true;
                  persistStudyCourse();
               }
               else {
                  vm.studyCourse.disabled = false;
               }
            };

            vm.getCategories = function () {
               return _.uniq(vm.categories);
            };

            vm.addSection = function () {
               setItemIndex();

               textObj = {
                  type        : 'section item',
                  title       : vm.sectionData.title || 'Section',
                  description : vm.sectionData.description || 'Description'
               };

               vm.studyCourseViewItems.splice(index, 0, textObj);
               vm.selected.item = index;
               persistStudyCourse(textObj);
               persistNestedListView();
            };

            vm.addVocabularyAssessment = function () {
               setItemIndex();

               textObj = {
                  id: swUtil.uuid(),
                  type: 'vocabulary assessment item',
                  text: 'Vocabulary Assessment',
                  readingTime : Context.parameters.timeExercises.vocabularyAssessment
               };

               vm.studyCourseViewItems.splice(index, 0, textObj);
               vm.selected.item = index;
               countBooksCumulativeTime();
               persistNestedListView();
               persistStudyCourse(textObj);
               setCourseTotalProgress();
            };

            vm.getCover = function (publication) {
               return swPublicationsService.getCoverPath(publication, 'medium', '#');
            };

            vm.onColumnSizeChanging = function (width) {
               if (!scroll) {
                  return;
               }
               width -= 1;
               scroll.getScrollableElement().css({
                  minWidth: width,
                  maxWidth: width,
                  width: width
               });
            };


            function createStudyItem(_publication){
              var studyItem = {};
              if(_publication.type === 'StudyGuide'){
                 studyItem = {
                   id : swUtil.uuid(),
                   bookId: _publication.bookId,
                   type: 'Book',
                   name: _publication.bookTitle,
                   author: _publication.bookAuthor,
                   description: _publication.description,
                   studyGuideId: _publication.id
                 };
               }
              else{
                 studyItem = {
                   id : swUtil.uuid(),
                   bookId: _publication.id,
                   type: _publication.type
                 };
              }
              return studyItem;
            }

            function updatePublication(_publication) {
              if(_publication.type === 'StudyGuide') {
                _publication = _.extend(_publication, {
                  studyGuideId    : _publication.id,
                  studyGuideAuthor : _publication.author,
                  studyGuideName  : _publication.name
                });

                _publication = _.extend(_publication, {
                  id       : _publication.bookId,
                  author   : _publication.bookAuthor,
                  name     : _publication.bookTitle,
                  cover    : _publication.bookCover,
                  type     : 'Book',
                  category : 'Book'
                });
                delete _publication.bookAuthor;
                delete _publication.bookTitle;
                delete _publication.bookCover;
              }
              return _publication;
            }

            vm.addPublication = function (publication) {
               var _publication = _.clone(publication), studyItem = {};
               studyItem = createStudyItem(_publication);
               _publication = updatePublication(_publication);
               setItemIndex();

               vm.studyCourseViewItems.splice(index, 0, _publication);
               vm.selected.item = index;

               if ( _publication.id ) {
                  setCourseTotalProgress();
               }
               countBooksCumulativeTime();
               persistNestedListView();
               persistStudyCourse(studyItem);
               if ( publication.category ) {
                  vm.categories.push(publication.category);
               }
            };

            var getCurrentPublicationId = function(publication) {
              var publicationId = publication.studyGuideId ? publication.studyGuideId :  publication.bookId;
              return publicationId || publication.id;
            };

            vm.editPublication = function (publication, index) {
               if ( !publication.id ) {
                  return false;
               }

               if ( !vm.studyCourse.disabled ) {
                  vm.editStudyCourseConfig.cancel();
               }

               vm.editMode = {
                  active      : true,
                  index       : index,
                  publication : publication,
                  publicationId : publication.bookId || publication.id,
                  studyCourseId : studyCourseId,
                  getCurrentPublicationId : getCurrentPublicationId
               };
               $scope.toolbarVisible = false;
            };

            vm.resetSearch = function () {
               vm.filter.text = '';
               _reloadPublication();
            };

            //edit functions
            var editData = {};
            var edit = function(editOptions){
               editData = JSON.parse(JSON.stringify(vm.studyCourseViewItems));
               vm.editable.item = editOptions.index;
            };

            var save = function() {
               vm.editable.item = -1;
              persistStudyCourse();
            };

            var cancel = function() {
               vm.studyCourseViewItems = editData;
               vm.editable.item = -1;
            };

            var showEdit = function (editOptions) {
               var isEdit = true;
               if (vm.editable.item !== -1) {
                  isEdit = vm.editable.item !== editOptions.index;
               }
               return isEdit;
            };

            vm.editConfig = {
              edit              : edit,
              save              : save,
              cancel            : cancel,
              showEditButtons   : showEdit
            };

            vm.deleteStudyCourseItem = function (publication, index) {
               vm.studyCourseViewItems.splice(index, 1);
               vm.studyCourse.studyCourseItems.splice(index, 1);
               if ( publication.id ) {
                  if ( publication.category ) {
                     vm.categories.splice(publication.category, 1);
                  }
               }
               setCourseTotalProgress();
               countBooksCumulativeTime();
               persistNestedListView();
               persistStudyCourse();
            };

            vm.moveItemUp = function (item, index) {
               moveUp(vm.studyCourseViewItems, item, index);
               moveUp(vm.studyCourse.studyCourseItems, item, index);
               persistStudyCourse();
               countBooksCumulativeTime();
               persistNestedListView();
               if ( vm.selected.item === index ) {
                  setSelection(index, index - 1);
               }
            };

            vm.moveItemDown = function (item, index) {
               moveDown(vm.studyCourseViewItems, item, index);
               moveDown(vm.studyCourse.studyCourseItems, item, index);
               persistStudyCourse();
               countBooksCumulativeTime();
               persistNestedListView();
               if ( vm.selected.item === index ) {
                  setSelection(index, index + 1);
               }
            };

            vm.setSelection = function (index, newIndex, itemsCount) {
               setSelection(index, newIndex, itemsCount);
            };

            vm.scrollStudyCourseList = function (scrollTop) {
               var _old = vm.toolbarVisible;
               vm.toolbarVisible = topCourseItemHeight < scrollTop || false;

               if ( _old !== vm.toolbarVisible ) {
                  vm.$evalAsync();
               }
            };

            vm.validateField = function (value) {
               return {
                  required: {
                     value: value,
                     valid: value
                  }
               };
            };

            vm.isAuthor = function (publication) {
               return userId === publication.userId;
            };

            vm.isPublication = function (item) {
              return _.has(item, 'type') && item.type !== 'section item' && item.type !== 'vocabulary assessment item';
            };

            function setItemIndex () {
               if ( vm.selected.item === -1 && vm.studyCourseViewItems.length === 0 ) {
                  index = 0;
               }
               else if ( vm.selected.item === -1 && vm.studyCourseViewItems.length !== 0 ) {
                  index = vm.studyCourseViewItems.length;
               }
               else {
                  index = vm.selected.item + 1;
               }
            }

            function moveUp (array, item, index) {
               if ( index > 0 ) {
                  array.splice(index, 1);
                  array.splice(index - 1, 0, item);
               }
            }

            function moveDown (array, item, index) {
               if ( (index + 1) < vm.studyCourseViewItems.length ) {
                  array.splice(index, 1);
                  array.splice(index + 1, 0, item);
               }
            }

            function BookItem(rawItem) {
               this.bookId = rawItem.bookId;
               if (rawItem.studyGuideId) {
                  this.studyGuideId = rawItem.studyGuideId;
               }
               if (rawItem.paragraphId && rawItem.finishingParagraphId) {
                 this.paragraphId = rawItem.paragraphId;
                 this.finishingParagraphId = rawItem.finishingParagraphId;
               }
               this.author = rawItem.author;
               this.description = rawItem.description || '';
               this.difficulty = rawItem.difficulty;
               this.id = rawItem.id;
               this.name = rawItem.name;
               this.type = rawItem.type;
               this.wordsCount = rawItem.wordsCount;
            }

            function _pickStudyCourseItems(studyCourseItem) {
               if (studyCourseItem.type === "Book") {
                  studyCourseItem = new BookItem(studyCourseItem);
               }
               return studyCourseItem;
            }

            function persistStudyCourse(item) {
              var studyCourse = {};
               if ( !_.has(vm.studyCourse, 'studyCourseItems') ) {
                  vm.studyCourse.studyCourseItems = [];
               }
               if ( item ) {
                  vm.studyCourse.studyCourseItems.splice(index, 0, item);
               }
               studyCourse = _.cloneDeep(vm.studyCourse);
               studyCourse.studyCourseItems = _.map(studyCourse.studyCourseItems, _pickStudyCourseItems);
               //debugger;//service client - result is not used
               swStudyCourseService.persistStudyCourse(studyCourse);
               swUserPublicationService.updateTitleLastRecentItem(vm.studyCourse.name, vm.studyCourse.author);
            }

            function onCurrentLanguageChange(setting) {
               vm.onFiltering(setting.value);
            }

            function onCurrentCategoryChange(setting) {
               var language = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               var value = setting.value || '';
               if (!value || value === 'Study guide' || value === 'Study course') {
                  vm.onFiltering(language, value);
               }
               else {
                  vm.onFiltering(language, 'Book', value);
               }
            }

            function setCourseTotalProgress () {
               vm.studyCourse.readingTime = 0;
               vm.studyCourse.difficulty  = 0;

               _.each(vm.studyCourseViewItems, function (item) {
                  if (item.type !== 'section item') {
                     vm.studyCourse.readingTime = incrementValue(vm.studyCourse.readingTime, item.readingTime);
                     vm.studyCourse.difficulty = getMaxValue(vm.studyCourse.difficulty, item.difficulty);
                  }
               });
            }

            function incrementValue (oldValue, newValue) {
               oldValue = +oldValue || 0;
               newValue = +newValue || 0;
               return oldValue + newValue;
            }

            function getMaxValue (oldValue, newValue) {
               oldValue = +oldValue || 0;
               newValue = +newValue || 0;
               return Math.max(oldValue, newValue);
            }

            function onItemEdit (options) {
               //TODO: ---

               var item = {
                  name         : options.publication.name,
                  author       : options.publication.author,
                  description  : options.publication.description
               };

               if ( options.publication.paragraphId && options.publication.finishingParagraphId ) {
                  item.paragraphId = options.publication.paragraphId;
                  item.finishingParagraphId = options.publication.finishingParagraphId;
               }

               if ( options.publication.studyGuideId ) {
                  item.studyGuideId    = options.publication.studyGuideId;
               }
               else {
                  item.studyGuideAuthor = '';
                  item.studyGuideName  = '';
               }

               calculatePublicationsReadingTime(options.publication, options.index);
               countBooksCumulativeTime();
               _.extend(vm.studyCourseViewItems[options.index], item);
               _.extend(vm.studyCourse.studyCourseItems[options.index], item);
               setCourseTotalProgress();
               persistNestedListView();
               persistStudyCourse();
            }

            function persistNestedListView () {
               var courseItems = vm.studyCourseViewItems,
                   prevCourseItem,
                   currentCourseItem,
                   sectionIndex,
                   viewIndex = 0,
                   viewIndexSub = 1;

               _.each(courseItems, function (item, index) {
                  prevCourseItem = courseItems[index - 1];
                  currentCourseItem = item;

                  if ( currentCourseItem.type === 'section item' ) {
                     sectionIndex = index;
                     _.extend(vm.studyCourseViewItems[sectionIndex], {
                        difficulty     : 0,
                        readingTime    : 0,
                        cumulativeTime : 0
                     });
                  }

                  if ( prevCourseItem && currentCourseItem.type !== 'section item' &&
                         ( prevCourseItem.type === 'section item' || prevCourseItem.sub )
                     ) {
                     _.extend(currentCourseItem, {
                        sub   : true,
                        index : viewIndex + '.' + viewIndexSub
                     });
                     viewIndexSub++;

                     if ( currentCourseItem.type === 'Book' ||
                          currentCourseItem.type === 'StudyCourse' ||
                          currentCourseItem.type === 'vocabulary assessment item' ) {
                        _.extend(vm.studyCourseViewItems[sectionIndex], {
                           readingTime    : incrementValue(currentCourseItem.readingTime, vm.studyCourseViewItems[sectionIndex].readingTime),
                           cumulativeTime : currentCourseItem.cumulativeTime,
                           difficulty     : getMaxValue(currentCourseItem.difficulty, vm.studyCourseViewItems[sectionIndex].difficulty)
                        });
                     }
                  }
                  else {
                     viewIndex++;
                     viewIndexSub = 1;
                     _.extend(currentCourseItem, {
                        sub   : false,
                        index : viewIndex
                     });
                  }
               });
            }

            function countBooksCumulativeTime () {
               var publications = [];

               _.each(vm.studyCourseViewItems, function (item, index) {
                  if ( item.type === 'section item') {
                      return;
                  }

                  vm.studyCourseViewItems[index].cumulativeTime = ( index !== 0 && publications.length > 0 ) ?
                                                                        incrementValue(_.last(publications).cumulativeTime, item.readingTime) :
                                                                        item.readingTime;
                  publications.push(vm.studyCourseViewItems[index]);
               });
            }

            function setSelection (oldIndex, newIndex, itemsCount) {
               vm.selected.item = (newIndex >= 0 && newIndex !== itemsCount) ? newIndex : oldIndex;
            }

            function excludeSelf (item) {
               return item.id !== vm.studyCourse._id;
            }

            function calculatePublicationsReadingTime (item, index) {
               var itemId = item.bookId || item.id;
               if (!item.hasOwnProperty('paragraphId')) {
                  return;
               }

               if (item.paragraphId && item.finishingParagraphId) {
                var currentPublicationId = getCurrentPublicationId(item);
                  swStudyCourseService.calcBookRangeProperties(currentPublicationId, {
                     start : item.paragraphId,
                     end   : item.finishingParagraphId
                  }).then(function (response) {
                     vm.studyCourseViewItems[index].readingTime = response.data.readingTime;
                     vm.studyCourseViewItems[index].difficulty = response.data.difficulty;
                     countBooksCumulativeTime();
                     setCourseTotalProgress();
                  });
               }
               else {
                  vm.studyCourseViewItems[index].readingTime = _.where(vm.publications, {id: itemId})[0].readingTime;
                  countBooksCumulativeTime();
                  setCourseTotalProgress();
               }
            }

            function storeLibraryFilteringSettings() {
              librarySettings = _.clone(swUnifiedSettingsService.getGroup('LibraryFilteringSettings'));
              swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedPublicationGroupName', '');
            }

            function restoreLibraryFilteringSettings() {
              swUnifiedSettingsService.updateGroup('LibraryFilteringSettings', librarySettings);
            }

            vm.onFiltering = _reloadPublication;

            vm.expandCollection = function expandCollection(collection) {
               vm.isCollectionExpanded = true;
               vm.collectionName = collection.name;
              swPublicationsService.searchCollectionItems(collection.id).then(_onPublicationsLoaded);
            };

            vm.collapseCollection = function collapseCollection() {
               vm.isCollectionExpanded = false;
              _reloadPublication(currentLanguage, contentType, currentCategory);
            };

            function _reloadPublication(language, contentType, category) {
               var text = vm.filter.text || '';
               vm.publicationsQuantity = 0;

               return swPublicationsService.searchPublications(text, 0, language, contentType, category)
                      .then(_onPublicationsLoaded);
            }

            function _onPublicationsLoaded(response) {
               vm.publications = response.filter(excludeSelf);
               if (scroll) {
                  swLazyLoadingHelper.unregister(scroll);
                  swLazyLoadingHelper.register(scroll, {
                     next: _loadMoreBooks,
                     rift: 50
                  });
               }
            }

            function _loadMoreBooks() {
               vm.publicationsQuantity += 25;
               if ( vm.publicationsQuantity >= vm.publications.length ) {
                  return $q.reject();
               }
               return $q.when(true);
            }
         }
      ]
   });
});
