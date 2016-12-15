define([
   'jquery',
   'underscore',
   'module',
   'swComponentFactory',
   'ApplicationContext',
   'text!./Search.html',
   'less!./Search.less',
   'less!./SearcherOol.less'
], function ($, _, module, swComponentFactory,  ApplicationContext, template) {
   'use strict';

   var COUNTERLOADRESULTS = 100;
   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         oneColumn : '&',
         extendapi : '='
      },
      controller : [
         '$q',
         '$sce',
         '$timeout',
         '$window',
         'swScrollFactory',
         'swApplicationToolbarService',
         'swSearchFieldService',
         'swSearch',
         'swSearchService',
         'swPublicationsService',
         'swUnifiedSettingsService',
         'swMaterialsService',
         'swOpenPublicationService',
         'swUserPublicationService',
         'swLazyLoadingHelper',
         'swCopyService',
         'swI18nService',
         'swLayoutManager',
         'SearchStemsWrapperService',
         function ($q,
                   $sce,
                   $timeout,
                   $window,
                   swScrollFactory,
                   swApplicationToolbarService,
                   swSearchFieldService,
                   swSearch,
                   swSearchService,
                   swPublicationsService,
                   swUnifiedSettingsService,
                   swMaterialsService,
                   swOpenPublicationService,
                   swUserPublicationService,
                   swLazyLoadingHelper,
                   swCopyService,
                   swI18nService,
                   swLayoutManager,
                   SearchStemsWrapperService,
                   /* jshint unused: true */
                   swComponentAugmenter,
                   $scope,
                   $element) {

            /* --- api --- */
            var vm = $scope;

            var clickedClass = 'tree-node-clicked';

            vm.isDirty = false;
            vm.selectedTitleIndex = -1;
            vm.currentIndex = 0;
            vm.searchResults = [];
            vm.resultsBooks = [];
            vm.searchResultsInfo = '';
            vm.totalSearchResults = 0;
            vm.visibleBooksCount = 1;
            vm.visibleSearchCount = 0;
            vm.loadResults = loadResults;
            vm.loadNextResults = loadNextResults;
            vm.loadPrevResults = loadPrevResults;
            vm.onNodeActivate = onNodeActivate;
            vm.copyLinkToBuffer = copyLinkToBuffer;
            vm.toggleResult = toggleResult;
            vm.currentBook = {};
            vm.currentLanguage = '';
            vm.getThumbnailByBook = getThumbnailByBook;
            vm.toggleParagraphVisibility = toggleParagraphVisibility;
            vm.showNotFoundResults = showNotFoundResults;
            vm.isPerformedSearch = isPerformedSearch;
            vm.focusOnSearchResult = focusOnSearchResult;
            vm.focusOnResults = focusOnResults;
            vm.prevNextSearchResult = prevNextSearchResult;
            vm.onResizeElement = onResizeElement;
            vm.isOpenablePublication = isOpenablePublication;
            vm.getAuthorAndTitle = getAuthorAndTitle;
            vm.maxLoadResults = 0;

            vm.isSearcher = ApplicationContext.application.toLowerCase() === 'searcher';

            vm.moreText = '';
            vm.extendapi.isTooltipVisible = false;
            vm.extendapi.isSearchCompleted = false;
            vm.extendapi.isDirty = false;
            vm.extendapi.setTooltipVisibility = setTooltipVisibility;
            vm.extendapi.getOpenParams = getOpenParams;
            vm.extendapi.calculateSizeResult = _onChangeSize;
            vm.oceanOfLigthsUrl = $window.jsapiPathPrefix || '';

            vm.toTrusted = toTrusted;


            /* === impl === */
            var stems = [],
               quotes = [],
               logger = $scope.logger,
               booksScroll,
               searchDefer,
               searchScroll,
               booksScrollHelper,
               isEditor = swApplicationToolbarService.isEditor(),
               isOneColumn = vm.oneColumn(),
               _debounceSeacrh = _.debounce(appliedSearchQueryChanged, 250),
               currentParagrephRes = [],
               minimumSearchLength = 2,
               currentSelectedTitleIndex = -1,
               recreateBooksScroll = _recreateScrollGenerator('visibleBooksCount', 'resultsBooks', 25, _calculateSize),
               recreateSearchScroll = _recreateScrollGenerator('visibleSearchCount', 'searchResults', 10, _calculateSize),
               searchResultsInfoMap = {
                  'en' : ['Search.BooksMatchesWereFound.en.label', 'Search.NoResultsFound.en.label'],
                  'fa' : ['Search.BooksMatchesWereFound.fa.label', 'Search.NoResultsFound.fa.label'],
                  'ar' : ['Search.BooksMatchesWereFound.ar.label', 'Search.NoResultsFound.ar.label']
               },
               calculateSizeStarted = false,
               layoutId = _.uniqueId('search_layoutId_');

            $scope.swInit = swInit;
            $scope.swDestroy = swDestroy;

            function swInit() {
               booksScroll = swScrollFactory.getParentScroll($element.find('.books-container'));
               swSearchFieldService.addOnSearchFieldChangeListener(_debounceSeacrh);
               swSearchFieldService.addOnKeyPressedListener(_onKeyPressed);
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _performSearch);
               _performSearch();
               prepareSharingData(vm.searchResults[vm.selectedTitleIndex]);
            }

            function swDestroy() {
               swLazyLoadingHelper.unregister(booksScroll);
               swLazyLoadingHelper.unregister(searchScroll);
               swSearchFieldService.removeOnSearchFieldChangeListener(_debounceSeacrh);
               swSearchFieldService.removeOnKeyPressedListener();
               swSearchService.setSearchResultsLength(0);
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _performSearch);
            }

            function getAuthorAndTitle(currentBook) {
               var isAuthorInTitle = swPublicationsService.isAuthorInBookTitle(currentBook.author, currentBook.title);
               return isAuthorInTitle ? currentBook.title : currentBook.title + ', ' + currentBook.author;
            }

            function toTrusted(html) {
                return $sce.trustAsHtml(html);
            }

            function _isAlive() {
               return $scope && !$scope.$$destroyed;
            }

            function appliedSearchQueryChanged() {
               if (_isAlive()) {
                  $scope.$apply(_performSearch);
               }
            }

            function _onKeyPressed(type) {
               if (!vm.resultsBooks.length) {
                  return;
               }

               if (type === 'p') {
                  loadPrevResults(vm.currentIndex, true);
               }
               focusOnResults();
            }

            function focusOnSearchResult() {
               removeClickedClass();
               var $el = $element.find('.tree-node-container');
               if ($el.length) {
                  vm.swFocus($el);
               }
            }

            function focusOnResults() {
               removeClickedClass();
               var $el = $element.find('.tree-container');
               if ($el.length) {
                  vm.swFocus($el);
               }
            }

            /**
             * Searches text in all books and rebuilds tree on results
             */
            function _performSearch() {
               // vm.searchResults = [];
               calculateSizeStarted = false;
               if(searchDefer) {
                searchDefer.reject();
               }
               vm.extendapi.isSearchCompleted = false;

               vm.currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               vm.currentSearchText = swSearchFieldService.getSearchText();
               if (!vm.currentLanguage || !_.isString(vm.currentSearchText) || /^\s*$/.test(vm.currentSearchText)) {
                  vm.resultsBooks = [];
                  vm.searchResults = [];
                  vm.totalSearchResults = 0;
                  vm.extendapi.isSearchCompleted = true;
                  swSearchService.inprocess(false);
                  swSearchService.setSearchResultsLength(0);
                  vm.currentBook = false;
                  vm.extendapi.isDirty = vm.isDirty = false;
                  swLazyLoadingHelper.unregister(booksScroll);
                  swLazyLoadingHelper.unregister(searchScroll);
                  return;
               }

               vm.currentSearchText = (vm.currentSearchText.length < minimumSearchLength) ? '' : vm.currentSearchText;

               swSearchService.inprocess(true);
               searchDefer = $q.defer();
               swSearch.search(_dataForSearch()).then(_.property('resolve')(searchDefer));
               searchDefer.promise.then(_onSearchBooksList);
            }

            function _dataForSearch(params) {
               return _.extend({
                  q : vm.currentSearchText,
                  lang : vm.currentLanguage,
                  clientID : vm.extendapi.clientid || ''
               }, params);
            }

            function _onSearchBooksList(data) {
               if(!data.rows || !data.isValidSearchQuery) {
                  vm.extendapi.isSearchCompleted = true;
                  swSearchService.inprocess(false);
                  return;
               }
               vm.extendapi.isDirty = vm.isDirty = vm.currentSearchText !== '';
               vm.resultsBooks = data.rows;
               vm.currentIndex = 0;
               vm.totalSearchResults = _.reduce(data.rows, function (total, current) {
                  return total + current.totalResults;
               }, 0);

               vm.searchResultsInfo = swI18nService.getResource(searchResultsInfoMap[vm.currentLanguage][0], {
                  sentencesTotal : vm.totalSearchResults,
                  booksTotal : vm.resultsBooks.length
               });

               vm.noSearchResults = swI18nService.getResource(searchResultsInfoMap[vm.currentLanguage][1]);

               if (vm.totalSearchResults !== 0) {
                  var query = {
                     id : vm.currentSearchText.trim() + '_' + vm.currentLanguage,
                     q : vm.currentSearchText,
                     lang : vm.currentLanguage
                  };
                  swSearch.setRecentSearchTabItem(query);
               }
               _showResultDelayed(data.rows[0]);
               swLazyLoadingHelper.unregister(booksScroll);
            }

            function _recreateScrollGenerator(vmCountKey, vmListKey, count, listener) {

               return function (scroll) {
                  vm[vmCountKey] = count;
                  swLazyLoadingHelper.unregister(scroll);
                  return swLazyLoadingHelper.register(scroll, {
                     next : _loadMore,
                     rift : 125
                  });
               };

               function _loadMore() {
                  var before = vm[vmCountKey];
                  vm[vmCountKey] += count;
                  $scope.$evalAsync(function() {
                     (listener || _.noop)(before, vm[vmCountKey]);
                  });
                  if (vm[vmCountKey] >= vm[vmListKey].length) {
                     return $q.reject();
                  }
                  return $q.when(true);
               }
            }

            function showNotFoundResults() {
               return vm.extendapi.isSearchCompleted && vm.resultsBooks.length === 0;
            }

            function _showResultDelayed(firstBook) {
               vm.currentBook = false;
               if (!firstBook) {
                  vm.extendapi.isSearchCompleted = true;
                  return;
               }

               loadResults(firstBook, 0);
            }

            function _refreshBookScrollData() {
               if (isOneColumn && booksScrollHelper) {
                  _.defer(function () {
                     booksScrollHelper.refreshAndCheck();
                  });
               }
            }

            function toggleResult(book) {
               if (!isOneColumn || vm.currentBook !== book) {
                  return;
               }
               vm.searchResults = vm.searchResults.length ? [] : currentParagrephRes;
            }

            function _scrollIntoViewIfNeeded($el, repeat) {
               var scrollWidget = swScrollFactory.getParentScroll($el);
               if (scrollWidget) {
                  scrollWidget.scrollIntoViewIfNeeded($el);
               }
               else if (!repeat) {
                  _.defer(_scrollIntoViewIfNeeded, $el, true);
               }
            }

            function addClickedClass(event) {
               removeClickedClass();
               $(event).addClass(clickedClass);
            }

            function removeClickedClass() {
               $element.find('.' + clickedClass).removeClass(clickedClass);
            }

            function loadResults(book, index, $event) {
               vm.maxLoadResults = COUNTERLOADRESULTS;
               if (calculateSizeStarted) {
                  return;
               }

               if (vm.currentBook === book) {
                  _refreshBookScrollData();

                  return;
               }

               vm.currentBook = book;
               vm.searchResults = [];
               vm.selectedTitleIndex = -1;

               if (!$event) {
                  var $currentEl = $element.find('.books-container .tree-node').eq(index);
                  if ($currentEl.length) {
                     _scrollIntoViewIfNeeded($currentEl);
                  }
               }
               else {
                  addClickedClass($event.currentTarget);
               }


               vm.currentIndex = index;
               swSearch.search(_dataForSearch({bookId : book.bookId})).then(_onSearchSingleBookSuccessful).then(function () {
                  if ($event) {
                     _scrollIntoViewIfNeeded($event.currentTarget);
                  }
               }, function() {
                  calculateSizeStarted = false;
               });
            }

            function _onSearchSingleBookSuccessful(data) {
               vm.extendapi.isSearchCompleted = true;
               if (!_isAlive() || !data.rows.length) {
                  return;
               }

               if (swSearchService.isInprocess()) {
                  booksScrollHelper = recreateBooksScroll(booksScroll);
                  _.defer(function () {
                     var el = booksScrollHelper && booksScrollHelper.scroll && booksScrollHelper.scroll.getScrollableElement();

                     if (el && el.length) {
                        el.addClass('force-redraw');
                     }
                  });
               }

               swSearchService.inprocess(false);
               vm.searchResults = data.rows;
               stems = data.stems;
               quotes = data.quotes;
               currentParagrephRes = data.rows;
               _changeSelectedTitleIndex(0);
               if (!isOneColumn) {
                  searchScroll = swScrollFactory.getParentScroll($element.find('.search-node-container'));
                  recreateSearchScroll(searchScroll);
               }
               _onChangeSize();
               _refreshBookScrollData();
               prepareSharingData(vm.searchResults[vm.selectedTitleIndex]);
            }

            function loadNextResults(index) {
               removeClickedClass();
               var _index = index + 1;
               if (_index >= vm.resultsBooks.length) {
                  swSearchFieldService.onFocusRestore();
                  _index = 0;
               }

               vm.currentIndex = _index;
               if (_index === 0) {
                  $timeout(function () {
                     loadResults(vm.resultsBooks[_index], _index);
                  });
               }
               else {
                  loadResults(vm.resultsBooks[_index], _index);
               }
            }

            function loadPrevResults(index, updateFromField) {
               removeClickedClass();
               var _index = index - 1;
               var maxIndex = vm.visibleBooksCount > vm.resultsBooks.length ? vm.resultsBooks.length : vm.visibleBooksCount;
               if (_index < 0) {
                  swSearchFieldService.onFocusRestore();
                  _index = maxIndex - 1;
                  if (!updateFromField) {
                     return;
                  }
               }

               vm.currentIndex = _index;
               loadResults(vm.resultsBooks[_index], _index);
            }

            function getThumbnailByBook(book, size) {
               return swPublicationsService.getCoverPath(_.omit(book, 'bookId'), size);
            }

            function prevNextSearchResult(index, type) {
               removeClickedClass();
               var _index = type === 'p' ? index - 1 : index + 1;
               var maxIndex = vm.visibleSearchCount > vm.searchResults.length ? vm.searchResults.length : vm.visibleSearchCount;
               if (vm.searchResults.length === 1 && index !== -1) {
                  return;
               }
               maxIndex -= 1;
               if (_index < 0) {
                  _index = maxIndex;
               }
               else if (_index > maxIndex) {
                  _index = 0;
               }
               _changeSelectedTitleIndex(_index);

               var $el = $element.find('.search-node-container .tree-sub-node').eq(_index);
               if ($el.length) {
                  _scrollIntoViewIfNeeded($el);
               }
            }

            function isChangeSize(size, oldSize) {
               return !_.isUndefined(oldSize.height) && !_.isUndefined(oldSize.width) &&
                  (oldSize.height !== size.height || oldSize.width !== size.width);
            }

            swLayoutManager.register({
               id: layoutId,
               layout: _onLayout
            });

            function _onLayout(context){
               var e = context.events;
               if ((e.orienting || e.resizing) && isOneColumn) {
                  _onChangeSize();
               }
            }

            var oldSizes = {
               newSize: {},
               oldSize: {}
            };
            function onResizeElement(size, oldSize) {
               var newSizes = {
                  newSize: size,
                  oldSize: oldSize
               };
               if (isChangeSize(size, oldSize) && !_.isEqual(newSizes, oldSizes) ) {
                  oldSizes = newSizes;
                  _onChangeSize();
               }
            }

            function _onChangeSize() {
               calculateSizeStarted = true;
               $scope.$evalAsync(_.ary(_calculateSize, 0));
            }

            function minimizeSentence(searchResult, searchWordsNumbers, numberLines) {
               var searchWrapTag = '<span class="search-req">';
               var sentenceParts = searchResult.paragraph.split(searchWrapTag);
               var separator = '...';
               if (searchWordsNumbers.length === 1 && Math.round(_.first(searchWordsNumbers)) >= 3) {
                  var centredParams = 0.4;
                  var numberChars = Math.round(searchResult.paragraph.length / numberLines * 3 * centredParams);
                  var partOfLine = sentenceParts[0].substring(sentenceParts[0].length - numberChars, sentenceParts[0].length);
                  sentenceParts[0] = separator + ' ' + partOfLine.substring(partOfLine.indexOf(' '), partOfLine.length);
                  searchResult.mininizeTitle = sentenceParts.join(searchWrapTag);
               }
               return searchResult;
            }

            function _calculateSize(start, end) {
               start = start || 0;
               end = end || vm.visibleSearchCount || vm.visibleBooksCount;
               var fakeEl = $element.find('.fake')[0];
               if (!fakeEl) {
                  return;
               }
               var fakeElChildren = $(fakeEl);
               var lineHeight = parseInt($(fakeEl).css('line-height').replace(/px/, ''), 10) || 1;
               var paraTop = $(fakeEl).position().top;
               var visibleSentences = vm.searchResults.slice(start, end);

               _.each(visibleSentences, function (visibleSentence) {
                  fakeElChildren.removeClass('without-paragraph');
                  fakeElChildren.trigger('destroy.dot').attr('paragraph', visibleSentence.paragraphs || '');
                  if (!visibleSentence.paragraphs) {
                     fakeElChildren.addClass('without-paragraph');
                  }
                  fakeElChildren.html(visibleSentence.paragraph);
                  var heigth = fakeEl.offsetHeight || 0;

                  var numberLines = Math.round(heigth / lineHeight);

                  var $allSearchWords = $(fakeEl).find('span.search-req');

                  var searchWordsNumbers = _.map($allSearchWords, function (word) {
                     return ($(word).position().top + paraTop) / lineHeight;
                  });
                  visibleSentence = minimizeSentence(visibleSentence, searchWordsNumbers, numberLines);

                  var expanded = fakeElChildren.closest('.expanded').removeClass('expanded');
                  if (numberLines > 3 && (_.first(searchWordsNumbers) >= 3 || searchWordsNumbers.length > 1)) {
                     fakeElChildren.trigger('destroy.dot').attr('paragraph', visibleSentence.paragraphs);
                     fakeElChildren.html(visibleSentence.mininizeTitle);
                     visibleSentence.title = fakeElChildren.dotdotdot().html();
                  }
                  else if (numberLines > 3) {
                     visibleSentence.title = fakeElChildren.dotdotdot().html();
                  }
                  else {
                     visibleSentence.title = visibleSentence.paragraph;
                  }
                  expanded.addClass('expanded');
               });
               _.defer(function () {
                  calculateSizeStarted = false;
                  if (searchScroll) {
                     searchScroll.getScrollableElement().trigger('sizeChange');
                  }
               });
            }

            function highlightMoreText(moreText, searchWords, searchQuotes, searchSentence) {
               moreText = SearchStemsWrapperService.highlightSearchSentenceInParagraph(moreText, searchSentence);
               moreText = SearchStemsWrapperService.highlightSearchResultInSentence(moreText, searchWords, searchQuotes);
               return moreText;
            }


            function getMoreText(index) {
               if (!isOneColumn && vm.searchResults[index].moreTextIndex) {
                  vm.moreText = '';
                  swSearch.getMoreText(vm.searchResults[index].moreTextIndex.start, vm.searchResults[index].moreTextIndex.len, vm.extendapi.clientid || '')
                     .then(function(response){
                        var moreText = response.data.text;
                        moreText = highlightMoreText(moreText, stems, quotes, vm.searchResults[index].paragraph);
                        $scope.$evalAsync(function() {
                           vm.moreText = moreText;
                        });
                     });
               }
            }

            function toggleParagraphVisibility(event, index) {
               if(isOneColumn || ((vm.selectedTitleIndex === index) ? -1 : index) !== -1) {
                  addClickedClass(event.currentTarget);
                  var selection = $window.getSelection();
                  if (!selection.isCollapsed && closest(selection.anchorNode, event.target)) {
                     return;
                  }
                  prepareSharingData(vm.searchResults[index]);
                  _changeSelectedTitleIndex(index);
               }
            }

            function _changeSelectedTitleIndex(index) {
               currentSelectedTitleIndex = index;
               vm.selectedTitleIndex = (vm.selectedTitleIndex === index) ? -1 : index;
               if (isOneColumn) {
                  onNodeActivate(currentParagrephRes[index]);
               }
               if (vm.selectedTitleIndex !== -1) {
                  vm.moreText = vm.searchResults[index].paragraph;
                  getMoreText(index);
               }
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

            function onNodeActivate(data, $event) {
               if ($event) {
                  $event.preventDefault();
                  $event.stopPropagation();
               }

               if (_.has(data || {}, '_id') && isOpenablePublication()) {
                  var publication = {
                     id : data._id,
                     type : 'Book'
                  };
                  data.stems = stems;
                  data.quotes = quotes;
                  data.lang = vm.currentLanguage;
                  var userPublication = {
                     publicationId : data._id,
                     personal : true,
                     lastOpenedAt : _.now(),
                     publicationType : 'Book'
                  };
                  if (vm.currentBook.title && vm.currentBook.author && !isEditor) {
                     swUserPublicationService.updateTitleLastRecentItem(vm.currentBook.title, vm.currentBook.author);
                  }
                  if (isEditor && !isOneColumn) {
                     swMaterialsService.updateMaterialsSet({}, publication).then(function (resp) {
                        data._id = resp.data;
                        userPublication.publicationId = resp.data;
                        userPublication.publicationType = resp.data;
                        swUserPublicationService.updateUserPublication(userPublication)
                           .then(function () {
                              openPublication(data);
                           });
                     });
                  }
                  else {
                     swUserPublicationService.updateUserPublication(userPublication)
                        .then(function () {
                           openPublication(data);
                        });
                  }
               }
               else {
                  logger.warn('No file hash for file ' + (data.node || {}).title);
               }
            }

            vm.readMoreResults = function(e) {
               e.stopPropagation();
               vm.maxLoadResults = vm.maxLoadResults + COUNTERLOADRESULTS;
            };

            function copyLinkToBuffer(data, event) {
               if (event) {
                  event.preventDefault();
                  event.stopPropagation();

                  event.target.classList.add('clicked');

                  _.delay(function () {
                     event.target.classList.remove('clicked');
                  }, 400);
               }
               var link = swPublicationsService.externalLink(data);
               var isAuthorInTitle = swPublicationsService.isAuthorInBookTitle(vm.currentBook.author, vm.currentBook.title, vm.currentLanguage);
               var copyTextObj = swCopyService.getTextForCopy(false, link, vm.currentBook.author, vm.currentBook.title, data.paragraphs, isAuthorInTitle);
               var copyFunction = function (event) {
                  swCopyService.copyListener(event, copyTextObj);
               };
               if (vm.currentBook.type !== 'Supplemental') {
                  $window.document.addEventListener('copy', copyFunction);
               }
               swCopyService.copyText(copyTextObj.plain);
               $window.document.removeEventListener('copy', copyFunction);
            }

            function getOpenParams() {
               var openParams = {};
               if (currentSelectedTitleIndex !== -1 && vm.searchResults[currentSelectedTitleIndex]) {
                  openParams = prepareOpenParams(vm.searchResults[currentSelectedTitleIndex], true);
               }
               return openParams;
            }

            function prepareOpenParams(searchParams, isOpenPublication) {
               var paras = _.map(vm.searchResults, _.property('paragraphId'));
               var openBookOptions = {
                  reload: !isOneColumn,
                  stems: searchParams.stems,
                  quotes: searchParams.quotes,
                  sentence: searchParams.paragraph,
                  lang: searchParams.lang,
                  paras: paras,
                  type: vm.currentBook.type,
                  _id: searchParams._id,
                  paragraphId: searchParams.paragraphId,
                  isAdvancedSearch: isOneColumn && !isOpenPublication,
                  openFromSearch: true
               };
               return openBookOptions;
            }

            function openPublication(data) {
               if(!data) {
                  return;
               }
               var options = prepareOpenParams(data);
               swOpenPublicationService.openPublication(options._id, '#' + options.paragraphId, options);
               if (vm.extendapi && vm.extendapi.currentPopUp) {
                  vm.extendapi.currentPopUp.hide(true);
               }
            }

            function setTooltipVisibility() {
               vm.extendapi.isTooltipVisible = !vm.extendapi.isTooltipVisible;
            }

            function isPerformedSearch(){
               return vm.isDirty;
            }

            function isOpenablePublication(){
               return vm.currentBook.type !== 'Supplemental' || !vm.currentBook.type;
            }

            function prepareSharingData(data) {
               if (!data) {
                  return false;
               }

               var bookThumbnail = getThumbnailByBook(vm.currentBook, 'large'),
                  description;

               data.sharingData = configureSharingData(data);
               data.viewConfig = {
                  visibleButtons : ['facebook']
               };

               function configureSharingData(sharingItem) {
                  description = $('<span>' + sharingItem.title + '</span>').text();
                  return {
                     name : vm.currentBook.author + ', ' + vm.currentBook.title,
                     shortDescription : description,
                     fullDescription : description,
                     picture : bookThumbnail,
                     link : swPublicationsService.externalLink(sharingItem)
                  };
               }
            }
         }
      ]
   });
});
