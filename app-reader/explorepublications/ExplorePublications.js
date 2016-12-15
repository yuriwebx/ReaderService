define([
   'module',
   'swComponentFactory',
   'underscore',
   'text!./ExplorePublications.html',
   'less!./ExplorePublications.less'
], function(module, swComponentFactory, _, template) {
   'use strict';
   
   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      isolatedScope : {
         isEditor             : '@',
         readingApi           : '='
      },
      controller : [
        'swOpenPublicationService',
        'swRecentBooksService',
        'swUnifiedSettingsService',
        'swSearch',
        'swSearchFieldService',
        'swContentProvider',
        '$timeout',
        function(
            swOpenPublicationService,
            swRecentBooksService,
            swUnifiedSettingsService,
            swSearch,
            swSearchFieldService,
            swContentProvider,
            $timeout,
            /* jshint unused:false */
            swComponentAugmenter,
            $scope,
            $element
        ) {
           $scope.swSubmachine.configure({
              'BeforeSearch': {
                 uri: 'before-search',
                 history: false
              }
           });

           $scope.extendapi = {};
           var openParams = {};

           $scope.swApplicationScrollType = 'NONE';
           var isEditor = $scope.isEditor === 'true';
           var tabs = [];
           $scope.tabModel = {};
           $scope.tabOptions = {
              data: function() {
                return tabs;
              },
              id: function(item) {
                return item.id;
              },
              format: function(item) {
                return item.q;
              },
              mode: function() {
                return 't';
              },
              click: function(item) {
                $scope.tabModel.selectedTab = item;
                var currentSearchText = swSearchFieldService.getSearchText();
                var currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               if (currentSearchText !== item.q || currentLanguage !== item.lang) {
                  swSearchFieldService.setSearchText(item.q);
                  swSearchFieldService.onSearchFieldChanged('');
                  swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedLibraryLanguage', item.lang);
                  swSearchFieldService.onSearchFieldChanged(item.q);
               }
              },
              itemTemplate: '<span><span>{{item.q}}</span><i ng-click="item.removeSelf($event, item)">X</i></span>',
              moreTemplate: '<span><span>More</span><i>X</i></span></span>',
              popupCustomClass: 'recent-searches-popup',
              i18n: {
                moreTooltipText: ''
              }
           };
           
            $scope.showLanguages = function(){
              var langs = swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages || [];
              return langs.length > 1;
            };

            $scope.tabsIsEmpty = function() {
               return tabs.length === 0;
            };

           var mediumColumn = 1000;
           var smallColumn = 500;
           var fixedElement = $element.find('.open-publication-button');
           var secondColumn = $element.find('.column-2');

           function _checkColumnWidth() {
              var _scw = secondColumn.width();
              secondColumn.toggleClass('mediumColumn',   _scw < mediumColumn);
              secondColumn.toggleClass('smallColumn',    _scw < smallColumn);
              $scope.startResizePosition = swUnifiedSettingsService.getSetting('ResizeColumnSettings', 'Explore');
           }

           // $scope.onColumnSizeChanging = function () {
           //    fixedElement.width(secondColumn.width());
           // };

           $scope.onChangeSize = function(size) {
              swUnifiedSettingsService.setSetting('ResizeColumnSettings', 'Explore', size);
              _checkColumnWidth();
              $scope.extendapi.calculateSizeResult();
           };
           $scope.startResizePosition = swUnifiedSettingsService.getSetting('ResizeColumnSettings', 'Explore');

           $scope.swInit = function () {
              swOpenPublicationService.addOpenPublicationListener(showButton);
              swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
              _onChangeLang();
              tabs = swSearch.getRecentSearchesTabItemVeiw();
              swSearch.addRecentSearchesTabListener(getTabs, 'ExplorePublications');
              _checkColumnWidth();
           };

           $scope.swSubmachine.$onBeforeSearch$completed = function () {
              $scope.swSubmachine.end('completed', $scope.swSubmachine.context().params);
           };

           $scope.swSubmachine.$onSearch$noResultsFound = function () {
              $scope.swInit();
           };

           $scope.swSubmachine.$on$end$enter = function () {
              swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
              swOpenPublicationService.removeOpenPublicationListener(showButton);
              swSearch.removeRecentSearchesTabListener(getTabs, 'ExplorePublications');
           };

           $scope.openPublicationInReader = function () {
               if (openParams.type === 'Supplemental') {
                  return;
               }
               var publication = {
                  id: openParams._id,
                  type: 'Book'
               };

               if (isEditor) {
                    swContentProvider.createStudyGuide(publication).then(function(resp) {
                     swOpenPublicationService.openPublication(resp.data, '#' + openParams.paragraphId, openParams, true);
                  });
               }
               else {
                  swOpenPublicationService.openPublication(openParams._id, '#' + openParams.paragraphId, openParams, true);
               }
           };
           
           $scope.showOpenButton = function(){
             return !_.isEmpty(openParams);
           };

           var showButton = function () {
              openParams = $scope.extendapi.getOpenParams();
           };

           function _onChangeLang() {
              var lang = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');

              var ltr = _.contains(['en'], lang);

              $element.toggleClass('dir-ltr', ltr);
              $element.toggleClass('dir-rtl', !ltr);
           }

           $scope.getItem = function(){
             return tabs.length !== 0;
           };

           function getTabs(searchesTabItem) {
              tabs = searchesTabItem;
              if($scope.tabOptions.update){
                $scope.tabModel.selectedTab = {};
                $scope.tabOptions.update();
              }
           }

        }]
   });
});