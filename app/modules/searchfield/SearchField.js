define([
   'module',
   'underscore',
   'swComponentFactory',
   'swAppUrl',
   'text!./SearchField.html',
   'less!./SearchField.less'
], function(module, _, swComponentFactory, swAppUrl, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         debounce : '=',
         extendapi : '=',
         keyboardActive: '='
      },

      controller : ['$scope', '$element', 'swSearchFieldService', 'swUnifiedSettingsService', 'swKeyboardService', '$window',
      function($scope, $element, swSearchFieldService, swUnifiedSettingsService, swKeyboardService, $window) {
         /* --- api --- */
         $scope.searchText = swSearchFieldService.getSearchText() || '';
         $scope.resetSearch = resetSearch;
         $scope.getDirection = getDirection;
         $scope.debounce = $scope.debounce || 500;
         $scope.direction = 'ltr';
         $scope.debounceSearch = _.debounce(appliedSearchQueryChanged, $scope.debounce);
         $scope.keyboardShowIcon = false;

         $scope.switchResult = function (type) {
            swSearchFieldService.onKeyPressed(type);
         };

         var leftDirectionLanguage  = ['en'];
         var localLang =  $window.navigator.language.slice(0, 2);

         $scope.keyboardToggle = function () {
            swKeyboardService.keyboardToggle();
         };

         $scope.swInit = function(){
            var currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
            swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', getDirection);
            swSearchFieldService.addFocusRestoreListener(focusRestore);
            $window.document.addEventListener('paste', changePasteText);
            getDirection({value: currentLanguage});
            swSearchFieldService.addOnSearchFieldChangeListener(_updateSearchText);
            if(swAppUrl.params.mode){
               if(swAppUrl.params.mode === 'search'){
                  $scope.searchText = swAppUrl.params.text;
                  searchQueryChanged();
               }
            }
         };

         $scope.swDestroy = function () {
            swSearchFieldService.removeFocusRestoreListener();
         };

         function changePasteText(e) {
            var copyText = $window.clipboardData ? $window.clipboardData.getData('text') : e.clipboardData.getData('text/plain');
            var pattern = /\n(.*)/g;
            copyText = copyText.replace(pattern, '');
            $scope.searchText = copyText;
            searchQueryChanged();
            e.preventDefault();
         }


         function focusRestore() {
            $scope.swFocus($element.find('.sw-input-text'));
         }

         function appliedSearchQueryChanged(){
            $scope.$apply(searchQueryChanged);
         }

         /* --- impl --- */
         function _updateSearchText(searchText){
            $scope.searchText = searchText || '';
         }

         function searchQueryChanged()
         {
            // resolving monkey speeding problem
            if ($scope && !$scope.$$destroyed) {
               swSearchFieldService.onSearchFieldChanged($scope.searchText);
           }
         }

         function resetSearch()
         {
            $scope.searchText = "";
            searchQueryChanged();
         }

         function getDirection(settings) {
            $scope.direction = leftDirectionLanguage.indexOf(settings.value) !== -1 ? 'ltr' : 'rtl';
            var currentLang = settings.value;

            switch (currentLang) {
               case 'en':
                  $scope.placeholder = 'Search Library';
                  break;
               case 'fa':
                  $scope.placeholder = 'جستجو در کتابخانه';
                  break;
               case 'ar':
                  $scope.placeholder = 'البحث في المكتبة';
                  break;
               default:
                  $scope.placeholder = '';
                  break;
            }
            $scope.keyboardShowIcon = localLang !== currentLang;
            $element.toggleClass('keyboard-icon-yes', $scope.keyboardShowIcon);
         }

      }]
   });
});