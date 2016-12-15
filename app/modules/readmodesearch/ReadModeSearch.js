define([
   'module',
   'swComponentFactory',
   'underscore',
   'text!./ReadModeSearch.html',
   'less!./ReadModeSearch.less'
], function(module, swComponentFactory, _, template){
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extendapi    : '='
      },
      controller: [
         'swSearchFieldService',
         'swUnifiedSettingsService',
         'swSearchService',
         function(
            swSearchFieldService,
            swUnifiedSettingsService,
            swSearchService,
            /* jshint unused:false */
            swComponentAugmenter,
            $scope,
            $element
         ) {

         $scope.swInit = function()
         {
            swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
            _onChangeLang();
         };

         $scope.swDestroy = function()
         {
            swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
         };

         $scope.isActive = function()
         {
            var isActive = $scope.extendapi.isDirty;
            isActive = isActive && !swSearchService.isInprocess();
            isActive = isActive && !!(swSearchFieldService.getSearchText());
            isActive = isActive && (swSearchFieldService.getSearchText().length > 0);
            return  isActive;
         };

         $scope.isNoResults = function(){
            return $scope.extendapi.isDirty && swSearchService.getSearchResultsLength() === 0;
         };

         $scope.showLanguages = function(){
            var langs = swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages || [];
            return langs.length > 1;
         };

         function _onChangeLang() {
            var lang = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');

            var ltr = _.contains(['en'], lang);

            $element.toggleClass('dir-ltr', ltr);
            $element.toggleClass('dir-rtl', !ltr);
         }
      }]
   });
});
