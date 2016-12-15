define([
   'underscore',
   'module',
   'swComponentFactory',
   'text!./Categories.html',
   'less!./Categories.less'
], function (_, module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      controller : [
         '$scope',
         'swApplicationToolbarService',
         //'$filter',
         'swUnifiedSettingsService',
         function ($scope, swApplicationToolbarService, /* $filter, */swUnifiedSettingsService) {
            var vm       = $scope;
            var isEditor = swApplicationToolbarService.isEditor();
            /* --api --- */
            vm.categories = [];
            vm.currentCategory = {};
            vm.categoryOptions = {};
            vm.reselectCategory = reselectCategory;


            /* --- impl --- */
            $scope.swInit = function () {
               var category = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedPublicationGroupName');
               vm.categories = _prepareCategories();
               var foundCategory = findCategory(category);
               vm.currentCategory = !_.isEmpty(vm.currentCategory) ? vm.currentCategory : (foundCategory ? foundCategory : '');
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
            };

            vm.categoryOptions = {
               popupCustomClass: 'categories',
               data : function () {
                  return $scope.categories;
               },
               isClearAllowed : function () {
                  return true;
               },
               i18n : {
                  placeholder : 'All categories'
               },
               format : function (category) {
                  return category.myText;
               }
            };

            var mapCategories = {
               'StudyCourse' : 'Course Syllabus',
               'StudyGuide'  : 'Book Notes',
               'Bahá’í'      : 'Books',
               'collection'  : 'Document Collections'
            };

            function _prepareCategories() {
               var publicationGroups = swUnifiedSettingsService.getGroup('LibraryParameters').publicationGroups || [],
                  categories = _.reduce(publicationGroups, getCategories, []);

               return _.map(_filterHiddenCategories(categories),
                  function (category) {
                     return {
                        id : category,
                        myText : mapCategories[category] || category
                     };
                  });

               function getCategories(res, group) {
                  return res.concat(group.categories);
               }

               function _filterHiddenCategories (_categories) {
                  return !isEditor && _.filter(_categories, function (_cat) {
                     return _cat !== 'StudyGuide';
                  }) || _categories;
               }
            }

            $scope.swDestroy = function () {
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedPublicationGroupName', onCurrentCategoryChange);
            };

            function onCurrentCategoryChange(setting) {
               vm.currentCategory = setting.value ? findCategory(setting.value.toLowerCase()) : setting.value;
            }

            function reselectCategory(category) {
               var _category = category && category.id;
               swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedPublicationGroupName', _category);
            }

            function findCategory(category) {
               return _.find(vm.categories, function (item) {return item.id === category;});
            }
         }
      ]
   });
});