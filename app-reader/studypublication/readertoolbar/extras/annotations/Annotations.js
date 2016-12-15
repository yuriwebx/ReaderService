define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./Annotations.html',
   'less!./Annotations',
   'less!./AnnotationsThemeMixin.less'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         gotoLocator: '&'
      },
      controller: [
         '$scope',
         '$filter',
         'swBookInfoService',
         'swReaderService',
         'swPublicationsService',
         'swApplicationToolbarService',
         'swContentProvider',
         'swI18nService',
         function (
            $scope,
            $filter,
            swBookInfoService,
            swReaderService,
            swPublicationsService,
            swApplicationToolbarService,
            swContentProvider,
            swI18nService) {
            var vm       = $scope;
            var bookKey  = swReaderService.getBookKey();
            var bookInfo = swBookInfoService.getBookInfo(bookKey);
            var details  = swPublicationsService.getLocalPublicationDetails(bookInfo._id);

            vm.swInit                = _init;
            vm.swDestroy             = _destroy;
            vm.goToAnnotation        = goToAnnotation;
            vm.switchMaterialsSource = switchMaterialsSource;
            vm.bySource              = bySource;
            vm.categoryFilter        = categoryFilter;
            vm.noteTypeFilter        = noteTypeFilter;

            var noteTypesI18n = {
               note     : swI18nService._getResource('Extras.Annotations.category.note'),
               bookmark : swI18nService._getResource('Extras.Annotations.category.bookmark'),
               comment  : swI18nService._getResource('Extras.Annotations.category.comment')
            };

            var onAnnotationsChangeListener = function (materials) {
               vm.categories = swContentProvider.getCategoriesObject();
               vm.uniqueCategories = _.compact(_.unique(_.pluck(materials, 'category')));
               vm.noteTypes = _.unique(_.pluck(materials, 'type'));
               vm.annotations = _.groupBy(materials, 'chapter');
            };

            vm.resetSearch = function () {
               vm.quickFilter.$ = '';
            };

            function _init () {
               swContentProvider.addOnNotesChangeListener(onAnnotationsChangeListener);
               swContentProvider.addOnPublicationDetailsChangeListener(getBookInfo);
               vm.expandedNoteId = false;
               vm.isEditor = swApplicationToolbarService.isEditor();
               vm.showOwnMaterials = _.isUndefined(bookInfo.notesTab) || bookInfo.notesTab;
               vm.selectModels = {};

               swBookInfoService.saveBookInfo(bookKey, {
                  extrasTab: 'Annotations'
               });
            }

            vm.noteTypesOptions = {
               popupCustomClass: 'nodetypes',
               data: function () {
                  return vm.noteTypes;
               },
               isClearAllowed: function () {
                  return true;
               },
               i18n: {
                  placeholder: swI18nService._getResource('Extras.Annotations.category.all')
               },
               format: function (type) {
                  return $filter('capitalize')(noteTypesI18n[type]);
               }
            };

            vm.uniqueCategoriesOptions = {
               popupCustomClass: 'categories',
               data: function () {
                  return vm.uniqueCategories;
               },
               isClearAllowed: function () {
                  return true;
               },
               i18n: {
                  placeholder: 'All types'
               },
               format: function (category) {
                  return $filter('capitalize')(category);
               }
            };

            function _destroy () {
               swContentProvider.removeOnNotesChangeListener(onAnnotationsChangeListener);
               swContentProvider.removeOnPublicationDetailsChangeListener(getBookInfo);
               swBookInfoService.saveBookInfo(bookKey, {
                  notesTab: vm.showOwnMaterials
               });
            }

            function goToAnnotation (index, chapter) {
               var note = vm.annotations[chapter][index];
               var locator = note.start ? note.start.id : note.paragraphId;
               vm.gotoLocator({
                  locator: '#' + locator
               });
            }

            function switchMaterialsSource (source) {
               vm.showOwnMaterials = source === 'own';
            }

            function bySource (item) {
               var isStudyGuide = item.hasOwnProperty('studyGuide') && item.studyGuide;
               return vm.isEditor || vm.showOwnMaterials !== isStudyGuide;
            }

            function categoryFilter (annotation) {
               var currentCategory = vm.selectModels.selected || annotation.category;
               return annotation.category === currentCategory;
            }

            function noteTypeFilter (annotation) {
               var currentType = vm.selectModels.noteType || annotation.type;
               return annotation.type === currentType;
            }

            function getBookInfo (_data) {
               vm.isStudyGuide = (details && details.type === 'StudyGuide') || _.has(_data, 'studyGuide');
            }
         }
      ]
   });
});