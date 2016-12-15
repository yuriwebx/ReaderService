/* global location */
define([
   'underscore',
   'module',
   'swComponentFactory',
   'text!./Search.html',
   'less!./Search.less'
], function (_, module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         oneColumn : '&',
         extendapi : '='
      },
      controller : [
         '$scope',
         '$timeout',
         '$window',
         'swSearchFieldService',
         'swSearch',
         'swSearchService',
         'swPublicationsService',
         'swUnifiedSettingsService',
         function ($scope,
                   $timeout,
                   $window,
                   swSearchFieldService,
                   swSearch,
                   swSearchService,
                   swPublicationsService,
                   swUnifiedSettingsService) {

            /* --- api --- */
            var vm = $scope;

            vm.isDirty = false;
            vm.extendapi.isSearchCompleted = false;
            vm.selectedTitleIndex = -1;
            vm.selectedBookIndex = -1;
            vm.searchResults = [];
            vm.resultsBooksCollection = [];
            vm.totalSearchResults = 0;
            vm.swInit = swInit;
            vm.swDestroy = swDestroy;
            vm.loadResults = loadResults;
            vm.loadNextResults = loadNextResults;
            vm.loadPrevResults = loadPrevResults;
            vm.getThumbnailByBook = getThumbnailByBook;
            vm.toggleParagraphVisibility = toggleParagraphVisibility;
            vm.showNotFoundResults = showNotFoundResults;
            vm.toggleResult = toggleResult;
            vm.extendapi.isTooltipVisible = false;
            vm.extendapi.setTooltipVisibility = setTooltipVisibility;
            vm.currentBook = {};

            /* === impl === */
            var _delayId;

            var minimumSearchLength = 2;
            var timeoutForContentShowing = 1500;
            var currentParagrephRes = [];
            var stems = [],
               quotes = [];

            function swInit() {
               swSearchFieldService.addOnSearchFieldChangeListener(_performSearch);
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _performSearch);
               _performSearch();
            }

            function swDestroy() {
               swSearchFieldService.removeOnSearchFieldChangeListener(_performSearch);
               swSearchFieldService.setSearchText(null);
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _performSearch);
            }

            /**
             * Searches text in all books and rebuilds tree on results
             */
            var _searchTimerId;

            function _performSearch() {
               vm.extendapi.isSearchCompleted = false;

               $scope.currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               $scope.currentSearchText = swSearchFieldService.getSearchText();
               if (!$scope.currentLanguage || !_.isString($scope.currentSearchText) || /^\s*$/.test($scope.currentSearchText)) {
                  vm.extendapi.isSearchCompleted = true;
                  swSearchService.inprocess(false);
                  swSearchService.setSearchResultsLength(0);
                  vm.currentBook = false;
                  vm.isDirty = false;
                  return;
               }

               $scope.currentSearchText = ($scope.currentSearchText.length < minimumSearchLength) ? '' : $scope.currentSearchText;

               $timeout.cancel(_delayId);
               $timeout.cancel(_searchTimerId);
               _searchTimerId = $timeout(function () {
                  swSearchService.inprocess(true);
                  swSearch.search({
                     q : $scope.currentSearchText,
                     lang : $scope.currentLanguage,
                     publicationPath : location.pathname,
                     clientID: vm.extendapi.clientid || ''
                  }).then(function _onSearchSuccessful(data) {
                     vm.isDirty = $scope.currentSearchText.length;
                     vm.resultsBooksCollection = data.rows;
                     vm.totalSearchResults = 0;
                     vm.resultsInBooksMap = [];
                     vm.totalSearchResults = data.rows.reduce(function (total, current) {
                        vm.resultsInBooksMap.push({
                           totalResults : current.totalResults,
                           opened : total === 0,
                           startFrom : total
                        });
                        return total + current.totalResults;
                     }, 0);

                     _showResultDelayed(data.rows[0]);
                     vm.extendapi.isSearchCompleted = true;
                  });
               }, timeoutForContentShowing);
            }

            function showNotFoundResults() {
               return vm.extendapi.isSearchCompleted && vm.resultsBooksCollection.length === 0;
            }

            function _showResultDelayed(firstBook) {
               vm.currentBook = false;
               if (!firstBook) {
                  return;
               }

               if (_delayId) {
                  $timeout.cancel(_delayId);
                  _delayId = 0;
               }

               vm.selectedBookIndex = -1;
               // _delayId = $timeout(function() {
               loadResults(firstBook, 0);
               // }, timeoutForContentShowing);
            }

            function toggleResult(book) {
               if (vm.currentBook === book && vm.oneColumn() && vm.searchResults.length !== 0) {
                  currentParagrephRes = vm.searchResults;
                  vm.searchResults = [];
               }
               else if (vm.currentBook === book) {
                  vm.searchResults = currentParagrephRes;
               }
            }

            function loadResults(book, index) {
               if (vm.currentBook === book) {
                  return;
               }

//               var currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
//               var currentSearchText = swSearchFieldService.getSearchText();

               vm.currentBook = book;
               vm.searchResults = [];
               vm.selectedTitleIndex = -1;
               vm.selectedBookIndex = index;
               swSearch.search({
                  q : $scope.currentSearchText,
                  lang : $scope.currentLanguage,
                  bookId : book.bookId,
                  clientID: vm.extendapi.clientid || ''
               }).then(function _onSearchSuccessful(data) {
                  swSearchService.inprocess(false);
                  vm.searchResults = data.rows;
                  currentParagrephRes = data.rows;
                  stems = data.stems;
                  quotes = data.quotes;
                  toggleParagraphVisibility(null, 0);
               });
            }

            function loadNextResults(index) {
               var _index = ( vm.resultsBooksCollection.length > index + 1 ) ? index + 1 : 0;
               loadResults(vm.resultsBooksCollection[_index], _index);
            }

            function loadPrevResults(index) {
               var _index = ( index > 0 ) ? index - 1 : vm.resultsBooksCollection.length - 1;
               loadResults(vm.resultsBooksCollection[_index], _index);
            }

            function getThumbnailByBook(book) {
               return swPublicationsService.getCoverPath(book, 'small');
            }

            function toggleParagraphVisibility(event, index) {
               var isCurrentIndex = (vm.selectedTitleIndex === index);
               if (event) {
                  var selection = $window.getSelection();
                  if (!selection.isCollapsed && closest(selection.anchorNode, event.target)) {
                     return;
                  }
               }
               vm.selectedTitleIndex = isCurrentIndex ? -1 : index;
            }

            function closest(elem, etalon) {
               while (elem) {
                  if (elem === etalon) {
                     return true;
                  }
                  else {
                     elem = elem.parentElement || elem.parentNode;
                  }
               }
               return false;
            }

            function setTooltipVisibility() {
               vm.extendapi.isTooltipVisible = !vm.extendapi.isTooltipVisible;
            }

            var oncopyHandler = function () {
               var selection = $window.getSelection();
               var para = selection.anchorNode;
               if (para && para.nodeType === 3) {
                  para = para.parentNode;
               }
               para = para.parentNode;
               if (para && para.className.indexOf('tree-sub-node-container') > -1) {
                  para = para.parentNode;
                  var bodyElement = $window.document.getElementsByTagName('body')[0];
                  var link, links = para.nextElementSibling && para.nextElementSibling.childNodes || [];
                  for (var i = 0; i < links.length; i++) {
                     if (links[i].href && links[i].href.indexOf('.htm') > 0) {
                        link = links[i].href;
                        if (links[i].hash) {
                           link = link.replace(links[i].hash, '');
                        }
                        break;
                     }
                  }
                  if (link) {
                     var newDiv = $window.document.createElement('div');
                     newDiv.style.position = 'absolute';
                     newDiv.style.left = '-99999px';
                     bodyElement.appendChild(newDiv);
                     newDiv.innerHTML = selection + ' More info at ' + link;
                     selection.selectAllChildren(newDiv);
                     $timeout(function () {
                        bodyElement.removeChild(newDiv);
                     });
                  }
               }
            };
            if (!$window.oncopyHandlerInstalled) { // Singleton for oncopy handler
               $window.oncopyHandlerInstalled = true;
               $window.document.getElementsByTagName('body')[0].oncopy = oncopyHandler;
            }
         }
      ]
   });
});
