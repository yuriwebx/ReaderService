define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./Extras.html',
   'text!./ExtrasTabsTemplate.html',
   'less!./Extras',
   'less!./ExtrasThemeMixin'
], function (module, _, swComponentFactory, template, extrasTabsTemplate) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         isEditor  : '@',
         publication: '=',
         extrasApi : '='
      },
      submachine : true,
      controller: [
         '$scope',
         'swReaderService',
         'swBookInfoService',
         'swOpenPublicationService',
         'swApplicationToolbarService',
         'swContentProvider',
         'swStudyClassService',
         function (
            $scope,
            swReaderService,
            swBookInfoService,
            swOpenPublicationService,
            swApplicationToolbarService,
            swContentProvider,
            swStudyClassService) {

            var vm       = $scope;
            var isEditor = swApplicationToolbarService.isEditor();
            var params   = vm.swSubmachine.context().confParams();
            var bookId;

            vm.swSubmachine.configure({
               'StudyContent': {
                  uri: 'studycontent',
                  history: false
               },
               'BookInfo' : {
                  uri : 'bookinfo',
                  history : false
               },
               'Annotations' : {
                  uri : 'annotations',
                  history : false
               },
               'Exercises' : {
                  uri : 'exercises',
                  history : false
               },
               'Discussions' : {
                  uri : 'discussions',
                  history : false
               }
            });

            var menuItems = [
               {
                  name      : 'StudyContent',
                  title     : vm.extrasApi.isStudyCourse ? 'Syllabus' : 'Collection',
                  isVisible : !!(vm.extrasApi.isStudyCourse || vm.extrasApi.collectionId)
               },
               {
                  name      : 'BookInfo',
                  title     : 'Info',
                  isVisible : true
               },
               {
                  name      : 'Annotations',
                  title     : 'Annotations',
                  isVisible : true
               },
               {
                  name      : 'Exercises',
                  title     : 'Exercises',
                  isVisible : false
               },
               {
                  name      : 'Discussions',
                  title     : 'Discussions',
                  isVisible : isDiscussionsVisible()
               }
            ];

            var initStateName = _currentTab();
            vm.inputSelect = {tabsState: _.find(menuItems, function (item) {
               return item.name === initStateName;
            })};

            vm.extrasTabsOptions = {
               data: function () {
                  return _.filter(menuItems, function (item) {
                     return item.isVisible;
                  });
               },
               id: function (item) {
                  return item.name ? item.name : item;
               },
               mode: function () {
                  return 't';
               },
               format: function (item) {
                  return item.name;
               },
               isMoreAllowed: function () {
                  return 'never';
               },
               itemTemplate: extrasTabsTemplate
            };

            vm.switchTab = function () {
               if (vm.inputSelect.tabsState) {
                  vm.swSubmachine.start(vm.inputSelect.tabsState.name);
               }
            };

            vm.swInit = function () {
               vm.logger.debug(params.enforceTOC);

               onOpenPublication();
               swApplicationToolbarService.setToolbarFixed(true);
               swOpenPublicationService.addOpenPublicationListener(onOpenPublication);
               swContentProvider.addOnExercisesChangeListener(getExercises);
            };

            vm.swDestroy = function() {
               swApplicationToolbarService.setToolbarFixed(false);
               swContentProvider.removeOnExercisesChangeListener(getExercises);
               swOpenPublicationService.removeOpenPublicationListener(onOpenPublication);
            };

            function getExercises (exercises) {
               var isExercises = isEditor || exercises.length > 0;
               changeExercisesVisibility(isExercises);

               function changeExercisesVisibility ( isExercises ) {
                  _.each(menuItems, function (item) {
                     if ( item.name === 'Exercises' ) {
                        item.isVisible = isExercises;
                     }
                  });
               }
            }

            function onOpenPublication(id) {
               var tabsState = _.get(vm.inputSelect.tabsState, 'name', '');
               if (id && (bookId === id || tabsState === 'StudyContent')) {
                  return;
               }

               var book = swReaderService.getBookKey();
               bookId = book._id;

               vm.swSubmachine.go(_currentTab());

               vm.gotoLocator = function (locator)
               {
                  var openParams = { reload : false, _id : book._id };

                  if (vm.extrasApi.isStudyCourse) {
                     openParams._studyCourseId = vm.extrasApi.isStudyCourse;
                     openParams.currentStudyItemId = book._id;
                  }
                  swOpenPublicationService.openPublication(book._id, locator, openParams);

                  var needSentEvent = _.any(['BookInfo', 'Annotations'], vm.swSubmachine.state);

                  if (needSentEvent && !vm.extrasApi.isWideMedia) {
                     vm.swSubmachine.end('onChangeLocator');
                  }
               };
            }

            vm.switchCollectionItem = function () {
               if ( !vm.extrasApi.isWideMedia ) {
                  vm.swSubmachine.end('onChangeCollectionItem');
               }
            };

            function _currentTab() {
               var book = swReaderService.getBookKey();
               var bookInfo = swBookInfoService.getBookInfo(book);
               var additionalTab = vm.extrasApi.isStudyCourse || vm.extrasApi.collectionId;

               if (bookInfo && bookInfo.extrasTab && bookInfo.extrasTab !== 'Bookmarks') {
                  return _.find(menuItems, {name : bookInfo.extrasTab, isVisible : true}) ? bookInfo.extrasTab : 'BookInfo';
               }
               return additionalTab ? 'StudyContent' : 'BookInfo';
            }

            function isDiscussionsVisible () {
               if ( !vm.extrasApi.isStudyClass && !vm.extrasApi.allowDiscussions ) {
                  return false;
               }
               var _info = getClassInfo() || {};
               return _info.class && _info.class.classType !== 'Independent Study';
            }

            function getClassInfo () {
               return swStudyClassService.getCurrentStudyClassInfo();
            }
         }]
   });
});