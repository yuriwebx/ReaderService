define([
  'swComponentFactory',
  'module',
  'underscore',
  'text!./LibraryView.html',
  'less!./LibraryView'

], function(
   swComponentFactory,
   module,
   _,
   template
) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      controller: ['$scope',
         '$filter',
         '$window',
         '$q',
         'swPublicationsService',
         'swDownloadBooksService',
         'swUnifiedSettingsService',
         'swApplicationScroll',
         'swLazyLoadingHelper',
         'swManagePublicationInfoService',
         function ($scope,
                   $filter,
                   $window,
                   $q,
                   swPublicationsService,
                   swDownloadBooksService,
                   swUnifiedSettingsService,
                   swApplicationScroll,
                   swLazyLoadingHelper,
                   swManagePublicationInfoService) {

            var vm = $scope;
            var allCategory = 'All categories';
            var currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');

            /* --- api --- */
            vm.reverse     = false;
            vm.books       = [];
            vm.categories  = [];
            vm.filter      = '';
            vm.category    = '';
            vm.visibleCount      = 0;

            vm.getAllBooks       = getAllBooks;
            vm.orderByFunction   = orderByFunction;
            vm.selectSortParam   = selectSortParam;
            vm.selectCategory    = selectCategory;
            vm.downloadBook      = downloadBook;
            vm.onFilterChange    = _.debounce(_onFilterChange, 300);
            vm.openDetails       = openDetails;

            vm.sortTypes = {
               title       : 'name',
               author      : 'author',
               description : 'description',
               category    : 'category',
               wordsCount  : 'wordsCount',
               paraCount   : 'paraCount',
               difficulty  : 'difficulty'
            };

            vm.sortCriteria = {
               criteria: vm.sortTypes.title
            };

            vm.categoriesOptions = {
               popupCustomClass: 'categories',
               data: function () {
                  return $scope.categories;
               },
               isClearAllowed: function () {
                  return true;
               },
               i18n: {
                  placeholder: allCategory
               },
               format: function (category) {
                  return $filter('capitalize')(category);
               }
            };

            /* === impl === */

            $scope.swInit     = swInit;
            $scope.swDestroy  = swDestroy;

            var getCategory = function (category) {
               return category !== allCategory ? category : '';
            };

            function swInit() {
               vm.filter      = '';
               vm.categories  = getCategoryList();
               vm.category    = allCategory;
               vm.getThumb    = getThumbnailByPublication;
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
               _loadBooks();
            }

            function swDestroy() {
               swLazyLoadingHelper.unregister(swApplicationScroll.getScroll());
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', onCurrentLanguageChange);
            }

            function getAllBooks() {
               return swPublicationsService.getAllBooks().then(_onLoadAllBooks);

               function _onLoadAllBooks(respose) {
                  var dataUrl = 'data:text/csv;utf-8,' + encodeURI(respose.data);
                  var hiddenElement = $window.document.createElement('a');
                  var filename = respose.headers()["content-disposition"].match(/(?!filename=)\w+\.csv/);
                  filename = filename !== null ? filename[0] : 'library.csv';
                  hiddenElement.setAttribute('href', dataUrl);
                  hiddenElement.setAttribute('download', filename);
                  hiddenElement.click();
               }
            }

            function getCategoryList() {
               var publicationGroups = swUnifiedSettingsService.getGroup('LibraryParameters').publicationGroups || [];
               var categories = publicationGroups && publicationGroups.length !== 0 ? publicationGroups[0].categories : 0;
               return categories;
            }

            function orderByFunction(book) {
               var criteria = $scope.sortCriteria.criteria;
               if (criteria === $scope.sortTypes.author && book[criteria]) {
                  var author = book[criteria].replace(/[\W+\s+{1,}]+/g, '');
                  return author;
               }
               else {
                  return book[criteria];
               }
            }

            function selectSortParam(criteria) {
               if (vm.sortCriteria.criteria === criteria) {
                  vm.reverse = !vm.reverse;
               }
               else {
                  vm.reverse = false;
                  vm.sortCriteria = {criteria: criteria};
               }
            }

            function selectCategory(currentCategory, criteria) {
               vm.sortCriteria = {criteria: criteria};
               currentCategory = currentCategory === undefined ? '' : currentCategory;
               vm.category = currentCategory.length !== 0 ? currentCategory : allCategory;
               _loadBooks();
            }

            function downloadBook(file) {
               $window.location.href = swDownloadBooksService.epubsUrl + file;
            }

            function _onFilterChange() {
               /*jshint validthis:true */
               vm.filter = this.filter;
               $scope.$evalAsync(_loadBooks);
            }

            function _loadBooks() {
               return swPublicationsService.searchPublications(vm.filter, 0, currentLanguage, '', getCategory(vm.category)).then(_onLoadBooks);
            }

            function loadMoreBooks() {
               vm.visibleCount += 10;

               if (vm.books.length === vm.visibleCount) {
                  return $q.reject();
               }
               return $q.when(true);
            }

            function _onLoadBooks(data) {
               vm.books = data;
               vm.visibleCount = 0;

               swLazyLoadingHelper.unregister(swApplicationScroll.getScroll());
               swLazyLoadingHelper.register(swApplicationScroll.getScroll(), {
                  next: loadMoreBooks,
                  rift: 150
               });
            }

            function getThumbnailByPublication (publication) {
               return swPublicationsService.getCoverPath(publication, 'small');
            }

            function openDetails ( _book ) {
               if (_book.type === 'Collection') {
                  expandCollection(_book);
               }
               else {
                  swManagePublicationInfoService.openInfoPopup(_book);
               }
            }

            function onCurrentLanguageChange(setting) {
               currentLanguage = setting.value;
               _loadBooks();
            }

            function expandCollection(collection) {
              vm.isCollectionExpanded = true;
              vm.collectionName = collection.name;
              swPublicationsService.searchCollectionItems(collection.id).then(_onLoadBooks);
            }

            vm.collapseCollection = function collapseCollection() {
              vm.isCollectionExpanded = false;
              _loadBooks();
            };

         }
      ]
   });
});
