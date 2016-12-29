define([
   'module',
   'Context',
   'swComponentFactory',
   'jquery',
   'underscore',
   'lith/lith',
   'nota/nota',
   'publication/locator',
   'publication/reading-position',
   'nota/fragmentSelector',
   'text!./PresentPublication.html',
   'text!./PresentPublicationEssayTaskTemplate.html',
   'text!./PresentPublicationEssayTaskReaderTemplate.html',
   'text!./PresentPublicationQuizTemplate.html',
   'text!./PresentPublicationMicroJournallingTemplate.html',
   'text!./NextPublicationButtonTemplate.html',
   'text!./PrevPublicationButtonTemplate.html',
   'text!./MetaBlockTemplate.html',
   'less!./PresentPublication'
], function (module, Context, swComponentFactory, $, _, Lith, Nota, Locator, ReadingPosition,
             FragmentSelector, template, essayTaskTemplate,
             essayTaskReaderTemplate, quizTemplate, microJournallingTemplate,
             nextPublicationButtonTemplate, prevPublicationButtonTemplate, metaBlockTemplate) {
   'use strict';

   swComponentFactory.create({
      module      : module,
      template    : template,
      // submachine : true,
      isolatedScope : {
         isReadingMode  : '@',
         readingApi     : '=',
         publication    : '='
      },
      controller : [
         '$interpolate',
         '$rootScope',

         '$window',
         'swApplicationScroll',
         'swStickyService',
         'swBookInfoService',
         'swReaderService',
         'swPublicationsService',
         'swReadModeSettingsService',

         '$timeout',
         '$compile',
         'swPopupService',
         'swContextPopupService',
         'swLongRunningOperation',
         'swExtrasService',
         'swUnifiedSettingsService',
         'swManageTestsService',
         'swManageEssayTasksService',
         'swMaterialsService',
         'SearchStemsWrapperService',
         'swStudyFlashcardsService',
         'swFlashcardsAssessmentService',
         'swQuizzesAssessmentService',
         'swUserPublicationService',
         'swEditCourseBookItemService',
         'swUserStudyService',
         'swContentProvider',
         'swStudyPublicationService',
         'swOpenPublicationService',
         'swFontLoaderService',
         'swCopyService',
         'swScrollFactory',
         'swFeatureDetector',
         'swLayoutManager',
         'swApplicationToolbarService',
         'swProgressToolbarService',
         'swStudyClassService',
         'swPublicationAudioManager',
         'swSidebarReadingPositionService',
         'swAgentService',

         function (
            $interpolate,
            $rootScope,

            $window,
            swApplicationScroll,
            swStickyService,
            swBookInfoService,
            swReaderService,
            swPublicationsService,
            swReadModeSettingsService,

            $timeout,
            $compile,
            swPopupService,
            swContextPopupService,
            swLongRunningOperation,
            swExtrasService,
            swUnifiedSettingsService,
            swManageTestsService,
            swManageEssayTasksService,
            swMaterialsService,
            SearchStemsWrapperService,
            swStudyFlashcardsService,
            swFlashcardsAssessmentService,
            swQuizzesAssessmentService,
            swUserPublicationService,
            swEditCourseBookItemService,
            swUserStudyService,
            swContentProvider,
            swStudyPublicationService,
            swOpenPublicationService,
            swFontLoaderService,
            swCopyService,
            swScrollFactory,
            swFeatureDetector,
            swLayoutManager,
            swApplicationToolbarService,
            swProgressToolbarService,
            swStudyClassService,
            swPublicationAudioManager,
            swSidebarReadingPositionService,
            swAgentService,

             /* jshint unused: true */
             swComponentAugmenter,
             $scope,
             $element

            ) {

            /* --- api --- */

            /* === impl === */
            $scope.swInit    = swInit;
            $scope.swDestroy = swDestroy;
            $scope.swLayout  = swLayout;
            $scope.isEditor  = swApplicationToolbarService.isEditor();

            var lith    = null,
                options = {},
                _scroll = null,
                timeoutPromise  = null;

            var serviceMap = {
               $timeout : $timeout,
               $interpolate : $interpolate,
               $window  : $window,
               $scope   : $scope,
               $compile : $compile,
               $rootScope : $rootScope,
               swPopupService    : swPopupService,
               swReaderService   : swReaderService,
               swBookInfoService : swBookInfoService,
               swExtrasService   : swExtrasService,
               swLayoutManager   : swLayoutManager,

               swStudyClassService  : swStudyClassService,
               swMaterialsService   : swMaterialsService,
               swManageTestsService : swManageTestsService,
               swManageEssayTasksService : swManageEssayTasksService,

               SearchStemsWrapperService     : SearchStemsWrapperService,
               swPublicationsService         : swPublicationsService,
               swContextPopupService         : swContextPopupService,
               swReadModeSettingsService     : swReadModeSettingsService,
               swStudyFlashcardsService      : swStudyFlashcardsService,
               swFlashcardsAssessmentService : swFlashcardsAssessmentService,
               swQuizzesAssessmentService    : swQuizzesAssessmentService,
               swUserPublicationService      : swUserPublicationService,
               swEditCourseBookItemService   : swEditCourseBookItemService,
               swContentProvider             : swContentProvider,
               swUserStudyService            : swUserStudyService,
               swStudyPublicationService     : swStudyPublicationService,
               swOpenPublicationService      : swOpenPublicationService,
               swCopyService                 : swCopyService,
               swPublicationAudioManager     : swPublicationAudioManager,
               swScrollFactory               : swScrollFactory,
               swApplicationScroll           : swApplicationScroll,
               swProgressToolbarService      : swProgressToolbarService,
               swUnifiedSettingsService      : swUnifiedSettingsService,
               swApplicationToolbarService   : swApplicationToolbarService,
               swSidebarReadingPositionService : swSidebarReadingPositionService
            };

            function swInit() {
               $scope.readingApi.setOpenFn(_open);
               $scope.readingApi.setUnboldTextFn(_unboldText);
               $scope.readingApi.onChangeScrollType = _onChangeScrollType;

               swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'fontSize', _onChangeFontSize);
               swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'fontName', _onChangeFontName);
               swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'expandedMarginNotes', _onChangeMarginNotes);
               swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'readingThemeName', _onChangeThemeName);

               swPublicationAudioManager.addKeyboardEventHandler($element[0]);

               _.each(swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages, function(lang) {
                  swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'fontName.' + lang, _onChangeFontName);
               });

               swSidebarReadingPositionService.addStateListeners();

               swApplicationToolbarService.setCanHideToolbarFn(_canHideToolbar);
            }

            function swDestroy() {
               if (lith) {
                  lith.destroy();
                  swContentProvider.destroy();
                  $timeout.cancel(timeoutPromise);
                  lith = null;
               }

               swAgentService.syncUserData();

               swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'fontSize', _onChangeFontSize);
               swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'fontName', _onChangeFontName);
               swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'expandedMarginNotes', _onChangeMarginNotes);
               swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'readingThemeName', _onChangeThemeName);

               swPublicationAudioManager.removeKeyboardEventHandler();

               _.each(swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages, function(lang) {
                  swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'fontName.' + lang, _onChangeFontName);
               });

               swSidebarReadingPositionService.removeStateListeners();

               swApplicationToolbarService.setCanHideToolbarFn(null);

               serviceMap.swPublicationAudioManager.stop();

               $scope.readingApi.clear();
               $scope.readingApi.onChangeScrollType = _.noop;
               _isFirstPage = true;

               _removeBorderScrollListener();
            }

            function swLayout(context) {
               var isViewportWidthChanged = lith && (context.events.resizing || context.events.orienting);
               var isResizing = context.events.resizing || context.events.orienting || context.events.resizingPublication;
               var isResizingPublication =  lith && (context.events.resizingPublication);

               isViewportWidthChanged = isViewportWidthChanged && (context.oldViewport.width !== context.viewport.width);
               if (lith && isResizing) {
                  lith.handleViewportResize(isViewportWidthChanged || isResizingPublication);
               }
            }

            $scope.startPlay = function () {
               swPublicationAudioManager.play();
            };

            function _unboldText() {
               timeoutPromise = $timeout(function() {
                  if (!lith) {
                     return;
                  }
                  SearchStemsWrapperService.undecorateSearchSentence();
               }, Context.parameters.presentPublicationConfig.foundVisibleInterval);
            }

            function _updateHighlight() {
               if (!lith) {
                  return;
               }
               SearchStemsWrapperService.undecorateSearchSentence();
               lith.updateSettings({ searchHighlighter : options }, true);
            }

            function _onChangeFontSize(setting) {
               if (lith) {
                  lith.updateSettings({ 'fontSize' : _getSettingsForFontSize(setting.value)});
               }
               $element.find('.scroll-border').css('height', Math.floor(setting.value / 100) + 1);
            }

            function _getSettingsForFontSize(fontSize) {
               var fontDesc = _getCurrentFontStyles();
               return {
                  value: fontSize,
                  lineHeight: fontDesc['line-height']
               };
            }

            function _onChangeMarginNotes(setting) {
               if (lith) {
                  lith.updateSettings({ 'marginNotesMode' : setting.value });
               }
            }

            function _onChangeFontName() {
               var fontDesc = _getCurrentFontStyles();
               var fontFamily = fontDesc['font-family'];
               swFontLoaderService.load(fontFamily).then(function() {
                  // if user don't change font
                  if (lith && fontDesc === _getCurrentFontStyles()) {
                     lith.updateSettings({ 'fontFamily' : fontDesc });
                     var size = swUnifiedSettingsService.getSetting('ReaderSettings', 'fontSize');
                     _onChangeFontSize({value: size});
                  }
               });
            }

            function _getCurrentFontStyles() {
               var font = swReadModeSettingsService.getFont();
               return font ? font.styles.declarations : {};
            }

            function _onChangeThemeName() {
               if (lith) {
                  var theme = swReadModeSettingsService.getThemeSettings();
                  lith.updateSettings({ 'theme' : theme.styles });
               }
            }

            function normalizeLocator(openPath) {
               return typeof openPath === 'string' ? openPath.replace(/^#?(para_)?/, '') : '';
            }

            function readingProgressTracker(progressType, progressData) {
               if (_.includes(['min', 'jump'], progressType)) {
                  var location = progressData.to ? progressData.to : progressData.paragraphLocator;
                  swSidebarReadingPositionService.updatePosition(location);
               }
               swUserStudyService.persistReadingProgressTracking(progressType, progressData);
            }

            function _open(_id, openPath, _opts) {
               var location = swPublicationsService.isPublicationLocalStored(_id) ? 'Local' : 'Remote',
                   currentTheme = {};

               _opts = _opts || {};
               options.stems = _opts.stems || [];
               options.quotes = _opts.quotes || [];
               options.lang   = _opts.lang || 'en';
               options.paras = _opts.paras || [];
               options.sentence = _opts.sentence || '';
               options.paragraphId = _opts.paragraphId || '';
               options.notLoadNota = _opts.notLoadNota;
               options.range = _opts.range;
               options.readRange = _opts.readRange;
               options.studyItemId = _opts.studyItemId;
               options.isReadingMode = $scope.isReadingMode;
               options.submachine = _opts;
               options.isAdvancedSearch = _opts.isAdvancedSearch;
               options.openFromSearch = _opts.openFromSearch;
               options.readingPosition = _opts.readingPosition;
               options.$element = $element;
               serviceMap.isAdvancedSearch  = options.isAdvancedSearch;

               $scope.hideReadingPositionToolbar = _opts.isAdvancedSearch;

               var prevBook = swReaderService.getBookKey();
               var prevBookId = prevBook && prevBook._id;
               var prevStudyItemId = prevBook && prevBook.studyItemId;

               if ($scope.isReadingMode === 'true') {
                  currentTheme = swReadModeSettingsService.getThemeSettings();
                }
                else {
                  currentTheme = swReadModeSettingsService.getDefaultThemeSettings();
                }

               swReaderService.setBookKey({
                  _id         : _id,
                  location    : location,
                  studyItemId : options.studyItemId,
                  currentChapter : ''
               });

               var bookSettings = {
                  finder          : _.pick(options, 'stems', 'quotes', 'paras', 'lang'),
                  theme           : currentTheme.styles,
                  fontFamily      : _getCurrentFontStyles(),
                  isTouch         : swFeatureDetector.isTouchInput(),
                  fontSize        : _getSettingsForFontSize(swReadModeSettingsService.getFontSize()),
                  shouldDetectReadingPosition: !($scope.isEditor || options.isAdvancedSearch),
                  readingProgressTracker: readingProgressTracker,
                  marginNotesMode : $scope.isReadingMode === 'true' && swReadModeSettingsService.getMarginNotesMode()
               };

               var elementId = normalizeLocator(openPath); // bridging the gap
               var locator;
               if (elementId) {
                  locator = Locator.deserialize(elementId);
               }
               else {
                  locator = new Locator.PublicationStartLocator();
               }

               var target = {
                  bookId   : _id,
                  locator  : locator
               };

               if (lith && prevBook && prevBookId === _id &&
                  (_.isUndefined(options.studyItemId) || options.studyItemId === prevStudyItemId))
               {
                  lith.repositionTo(target.locator);
                  if (options.isAdvancedSearch || options.openFromSearch) {
                     _updateHighlight();
                  }
                  return;
               }

               if (lith) {
                  lith.destroy();
               }
               else if (options.stems.length) {
                  _unboldText();
               }

               if (_.get(options, 'readingPosition.locator', false)) {
                  // assert !selectionRequest.readingPosition.startsWith('para')
                  target.readingPosition = {
                     locator : Locator.deserialize(normalizeLocator(options.readingPosition.locator))
                  };
                  if (_.get(options, 'readingPosition.optimisticReadingPosition')) {
                     target.readingPosition.optimisticReadingPosition =
                        Locator.deserialize(options.readingPosition.optimisticReadingPosition);
                  }
                  if (_.get(options, 'readingPosition.pessimisticReadingPosition')) {
                     target.readingPosition.pessimisticReadingPosition =
                        Locator.deserialize(options.readingPosition.pessimisticReadingPosition);
                  }
               }

               var lithPluginsHelper = new LithPluginHelper(serviceMap, $scope.isEditor, options);

               var plugins = lithPluginsHelper.getPlugins();
               swContentProvider.destroy();
               swContentProvider.init(_id, options.readRange, $scope.readingApi.classId).then(function() {
                  if ($scope.$$destroyed) {
                     return;
                  }
                  var swLongRunningOperationEnd = swLongRunningOperation.start('openBook');
                  var _bookOpened = function () {
                     swLongRunningOperationEnd();
                     swProgressToolbarService.setStartPopupVisibility(true);
                  };

                  target.contentProvider = {
                     fetchBefore : swContentProvider.fetchBefore,
                     fetchAfter  : swContentProvider.fetchAfter,
                     fetchInitialBlocks : swContentProvider.fetchInitialBlocks
                  };
                  _onChangeScrollType();
                  lith = Lith.openBook($('#epubHolder'), target, bookSettings, plugins, _bookOpened, _scroll);
                  swContentProvider.setView(lith);

                  $timeout(function () {
                     lith.handleViewportResize(true);
                     _onChangeFontName();
                  });

                  // updating of "RecentBooks"
                  swUserPublicationService.getRecentBooks();
               })
               .catch(function () {
                  swPopupService.showInfoBox({
                     content : '<span>Sorry, the book was not downloaded</span>',
                     buttons : [{
                        name  : 'return',
                        click : _.get($scope.readingApi, 'returnToLibrary', _.noop)
                     }]
                  });
               });
            }

            function _onChangeScrollType() {
               _removeBorderScrollListener();
               _initScroll();
               if (lith) {
                  lith.setScroll(_scroll);
               }
               _addBorderScrollListener();
            }

            function _removeBorderScrollListener() {
               if (_scroll) {
                  _scroll.removeListener(_onBorderScroll);
               }
            }

            function _addBorderScrollListener() {
               _scroll.addListener(_onBorderScroll);
            }

            function _initScroll() {
               _scroll = swScrollFactory.getParentScroll($element) || swApplicationScroll.getScroll();
            }

            function _onBorderScroll() {
               $element.toggleClass('on-scroll', true);
            }

            function _canHideToolbar() {
               return !_isFirstPage && !swApplicationToolbarService.isToolbarFixed();
            }
            _defaultCanHideToolbarFn = _canHideToolbar;
         }]
   });

   var _isFirstPage = true;
   var _defaultCanHideToolbarFn = _.noop;

   function LithPluginHelper(serviceMap, isEditor, options) {
      this.serviceMap = serviceMap;
      this.activePopup = {};
      this.nota = null;
      this.options = options;
      this.getPlugins = function() {
         var pluginsArray = [
            this.openPublication(),
            this.changePosition(isEditor, options.isAdvancedSearch),
            this.changeLayout(isEditor, options.isAdvancedSearch),
            this.footnode(),
            this.metaBlock(),
            this.additionalButton(isEditor),
            this.scrollBorder(options.$element),
            this.searchHighlighter(options)
         ];

         if (!isEditor) {
            pluginsArray.push(this.toggleToolbarOnScroll());
         }

         if (options.notLoadNota) {
            pluginsArray.push(this.fragmentSelectorRunner(options.range));
            pluginsArray.push(this.fragmentSelectorRenderer(options.range));
         }
         else {
            // first initialize nota
            pluginsArray.push(this.notaRunner(isEditor, options.isReadingMode));
            // then run nota.toggleMarginNotes(boolean)
            pluginsArray.push(this.marginNoteMode());
            pluginsArray.push(this.notaRenderer(isEditor, options.isReadingMode));
         }
         return pluginsArray;
      };
   }

   _.extend(LithPluginHelper.prototype, {
      openPublication: function() {
         var pluginHelper     = this,
            $timeout          = this.serviceMap.$timeout,
            swReaderService   = this.serviceMap.swReaderService,
            swBookInfoService = this.serviceMap.swBookInfoService,
            swContentProvider = this.serviceMap.swContentProvider;
         return {
            execute : function() {
               var bookKey = swReaderService.getBookKey();
               var details = swContentProvider.getDetails();
               var bookInfo = _.pick(details, ['title', 'author', 'type', 'wordsCount']);
               bookInfo.lastReadTime = _.now();

               if (!pluginHelper.options.submachine.isDevelopStudyCourse) {
                        swBookInfoService.saveBookInfo(bookKey, bookInfo);
                        $timeout(swReaderService.setMetadata.bind(swReaderService, bookInfo));
                     }
            },
            phase : 'onLoad'
         };
      },
      changePosition: function(isEditor, isAdvancedSearch) {
         var swReaderService           = this.serviceMap.swReaderService,
             swUserPublicationService  = this.serviceMap.swUserPublicationService,
             swStudyPublicationService = this.serviceMap.swStudyPublicationService,
             swProgressToolbarService  = this.serviceMap.swProgressToolbarService,
             swSidebarReadingPositionService  = this.serviceMap.swSidebarReadingPositionService,
             publication               = this.serviceMap.$scope.publication,
             pluginHelper              = this;

         return {
            execute : function (positionChangeData) {
               var locator = positionChangeData.locator;
               var progressInWords = positionChangeData.progressInWords;
               var bookKey = swReaderService.getBookKey();
               var bookmark = {
                  fragmentId : locator.toJSON()
               };
               var progressToolbarData = {
                  currentPosition: positionChangeData.locator,
                  pessimisticReadingPosition: positionChangeData.pessimisticReadingPosition,
                  isFirstPage: positionChangeData.isFirstPage,
                  isLastPage: positionChangeData.isLastPage
               };


               if (!isAdvancedSearch) {
                  if (isEditor) {
                     swUserPublicationService.saveEditorReadingPosition(bookmark, bookKey._id);
                  }
                  else {
                     if (positionChangeData.readingPosition) { // cheater caught
                        progressToolbarData.readingPosition = positionChangeData.readingPosition;
                        swStudyPublicationService.updateCurrentProgress(bookmark, -1, bookKey._id);
                     }
                     else {
                        swSidebarReadingPositionService.updatePosition(positionChangeData.pessimisticReadingPosition);
                        swStudyPublicationService.updateCurrentProgress({
                           fragmentId : bookmark.fragmentId,
                           locator : bookmark.fragmentId,
                           optimisticReadingPosition : positionChangeData.optimisticReadingPosition.toJSON(),
                           pessimisticReadingPosition : positionChangeData.pessimisticReadingPosition.toJSON()
                        }, progressInWords, bookKey._id);
                     }
                     swSidebarReadingPositionService.redrawPlayButtons();
                  }
               }
               if (publication) {
                  publication._update({
                     currentChapterId: positionChangeData.chapterId,
                     shouldScrollIntoView: true
                  });
               }
               swProgressToolbarService.onPositionChange(progressToolbarData);
               if (pluginHelper.activePopup.extend && pluginHelper.activePopup.extend.updateLayout) {
                  pluginHelper.activePopup.extend.updateLayout();
               }
            },
            phase : 'onPositionChange'
         };
      },

      searchHighlighter : function (options){
        var searchStemsWrapperService = this.serviceMap.SearchStemsWrapperService;
        return {
            view     : null,
            name     : 'searchHighlighter',
            execute  : function() {
               var $document = this.view.getScrollableElement();
               if (!$document || (!options.isAdvancedSearch && !options.openFromSearch)) {
                  return;
               }

               var paragraphId  = options.paragraphId,
                    stems   = options.stems.slice(0),
                   quotes  = options.quotes.slice(0),
                   paras   = options.paras.slice(0),
                   foundSentence = options.sentence;
               var para =  $document.find('#' + paragraphId)[0];
               if (!para) {
                  return;
               }
               var query = paras.map(function(key) {
                  return '#' + key;
               }).join(', ');

               searchStemsWrapperService.undecorateSearchSentence();

               $document.find(query).each(function(/* jshint unused:true */idx, para) {
                  searchStemsWrapperService.highlightSearchResult(para, stems, quotes);
               });

               searchStemsWrapperService.highlightSentence(para, foundSentence);

            },
            phase : 'onPartialLoad'
         };
      },

      changeLayout: function(/*isEditor, isAdvancedSearch*/) {
         var pluginHelper = this,
             swSidebarReadingPositionService = this.serviceMap.swSidebarReadingPositionService/*,
             swStudyPublicationService = this.serviceMap.swStudyPublicationService,
             swReaderService           = this.serviceMap.swReaderService*/;
         return {
            execute: function(/*para, progress*/) {
              //var bookKey = swReaderService.getBookKey();
              if (pluginHelper.nota) {
                 pluginHelper.nota.layoutChanged();
              }
               swSidebarReadingPositionService.redrawPlayButtons(true /* force redraw */);
               //if (!isEditor && !isAdvancedSearch) {
               //   var bookmark = {
               //      fragmentId: para
               //   };
               //   swStudyPublicationService.updateCurrentProgress(bookmark, progress, bookKey._id);
               //}
            },
            phase: 'onLayoutChange'
         };
      },

      marginNoteMode: function() {
         var pluginHelper = this;
         return {
            name: 'marginNotesMode',
            view: null,
            execute: function(marginNotesMode) {
               if (pluginHelper.nota) {
                  pluginHelper.nota.toggleMarginNotes(marginNotesMode);
               }
            }
         };
      },

      notaRenderer: function() {
         var pluginHelper = this;
         return {
            view: null,
            execute: function(materials, $block) {
               if ($block === void 0) {
                  pluginHelper.nota.loadMaterials(materials);
               }
               else {
                  pluginHelper.nota.decorateBlock($block, materials);
               }
            },
            phase: 'onPartialLoad'
         };
      },

      footnode: function() {
         // var swPopupService = this.serviceMap.swPopupService;
         return { // footnote
            view : null,
            execute : function ($document) {
               $document.on('click', 'a', function (ev) {
                  var anchor = ev.currentTarget;
                  if (anchor.getAttribute('epub:type') !== 'noteref') {
                     return;
                  }
                  var $footnote = $document.find(anchor.getAttribute('href'));
                  // var footnoteId = anchor.getAttribute('data-fnid');
                  $footnote.toggle();
                  $footnote.attr('data-selectable', 'none'); // Nota resp
                  /*if ($footnote.length) {
                     swPopupService.showInfoBox({
                        content : '<span class="footnoteId">' + footnoteId + '</span>' + $footnote.text(),
                        customClass : 'no-bttns'
                     });
                  }*/
               });
            }
         };
      },

      metaBlock: function() {
         var swPublicationAudioManager = this.serviceMap.swPublicationAudioManager;
         var swContentProvider        = this.serviceMap.swContentProvider;
         var swUnifiedSettingsService = this.serviceMap.swUnifiedSettingsService;
         var swPublicationsService    = this.serviceMap.swPublicationsService;
         var $scope                   = this.serviceMap.$scope;
         var $compile                 = this.serviceMap.$compile;
         var swScrollFactory          = this.serviceMap.swScrollFactory;
         var swApplicationScroll      = this.serviceMap.swApplicationScroll;

         var isAudioPlaying;
         var isButtonDisabled;
         function audioStateListener(s) {
            $scope.$evalAsync(function() {
               isAudioPlaying = s === 'play';
               isButtonDisabled = swPublicationAudioManager.isButtonDisabled();
            });
         }
         swPublicationAudioManager.addOnStateChangeListener(audioStateListener);

         function prepareMetaBlock() {
            var details = $scope.$new(true);
            _.extend(details, _.cloneDeep(swContentProvider.getDetails()));
            details.startPlay = $scope.startPlay;
            details.image = swPublicationsService.getCoverPath(details);
            details.readingTime = Math.round(details.wordsNumber / 140) * 60000;
            details.difficulty =  swPublicationsService.showDifficulty ? " , difficulty: "  + details.difficulty : '';
            details.isAudioPlaying = function() {
               return isAudioPlaying;
            };
            details.isButtonDisabled = function() {
               return isButtonDisabled;
            };
            details.isPlayButtonVisible = function() {
               return !$scope.isEditor && (swContentProvider.hasAudio() || swUnifiedSettingsService.getSetting('ScrollSettings', 'reproductionType') === 'TTS');
            };
            return $compile(metaBlockTemplate)(details);
         }

         return {
            view: null,
            destroy: function() {
               swPublicationAudioManager.removeOnStateChangeListener(audioStateListener);
            },
            execute: function() {
               var $scrollableElement = this.view.getScrollableElement();
               if (!$scrollableElement) {
                  return;
               }

               var $firstParagraph = $scrollableElement.find('.paragraph-first');
               var $publicationPlaceholder = $scrollableElement.closest('#publication-placeholder');
               var $metaBlock = $publicationPlaceholder.find('.book-info-box');
               var scroll = swScrollFactory.getParentScroll($scrollableElement) || swApplicationScroll.getScroll();

               if ($firstParagraph.length) {
                  if (!$metaBlock.length) {
                     $publicationPlaceholder.prepend(prepareMetaBlock());
                     $metaBlock = $publicationPlaceholder.find('.book-info-box');
                     scroll.setScrollTop(scroll.getScrollTop() + $metaBlock.outerHeight());
                  }
               }
               else if ($metaBlock.length) {
                  scroll.setScrollTop(scroll.getScrollTop() - $metaBlock.outerHeight());
                  $metaBlock.remove();
               }
            },
            phase: 'onPartialLoad'
         };
      },

      additionalButton: function(isEditor) {
         var swContentProvider        = this.serviceMap.swContentProvider;
         var swReaderService          = this.serviceMap.swReaderService;
         var swOpenPublicationService = this.serviceMap.swOpenPublicationService;
         var $scope                   = this.serviceMap.$scope;

         function addPrevButton($element, callback) {
            var $prevButton = $element.find('.prev-publication-button');
            var $firstParagraph = $element.find('.paragraph-first').first();
            if ($firstParagraph.length && !$prevButton.length) {
               $prevButton = $(parseTemplate(isEditor, 'prevPublicationButton'))
                  .on('click', callback);
               $firstParagraph.before($prevButton);
            }
         }

         function addNextButton($element, callback) {
            var $nextButton = $element.find('.next-publication-button');
            var $lastParagraph = $element.find('.paragraph-last').last();
            if ($lastParagraph.length && !$nextButton.length) {
               $nextButton = $(parseTemplate(isEditor, 'nextPublicationButton'))
                  .on('click', callback);
               $lastParagraph.after($nextButton);
            }
         }

         return {
            view: null,
            execute: function() {
               var details = swContentProvider.getDetails();
               var bookKey = swReaderService.getBookKey();
               var $scrollableElement = this.view.getScrollableElement();

               if (!$scrollableElement || isEditor) {
                  return;
               }

               if ($scope.readingApi.isStudyCourse) {
                  if (swReaderService.checkPublicationNext()) {
                     addNextButton($scrollableElement, function() {
                        swReaderService.openPublicationNext(bookKey._id);
                     });
                  }
               }
               else {
                  if (details.prevItemId && !$scope.readingApi.classId) {
                     addPrevButton($scrollableElement, function() {
                        swOpenPublicationService.openPublication(details.prevItemId, null, {reload : true});
                     });
                  }
                  if (details.nextItemId && !$scope.readingApi.classId) {
                     addNextButton($scrollableElement, function() {
                        swOpenPublicationService.openPublication(details.nextItemId, null, {reload : true});
                     });
                  }
               }
            },
            phase: 'onPartialLoad'
         };
      },

      toggleToolbarOnScroll: function() {
         var swLayoutManager = this.serviceMap.swLayoutManager;
         var swApplicationToolbarService = this.serviceMap.swApplicationToolbarService;
         return {
            view: null,
            execute: function(positionChangeData) {
                swLayoutManager.layout(positionChangeData.isFirstPage || positionChangeData.readingPosition ? 'showToolbar' : 'hideToolbar');
               _isFirstPage = positionChangeData.isFirstPage;
               var fn = positionChangeData.readingPosition ? _.constant(false) : _defaultCanHideToolbarFn;
               swApplicationToolbarService.setCanHideToolbarFn(fn);
            },
            phase: 'onPositionChange'
         };
      },

      notaRunner: function(isEditor, isReadingMode) {
         var pluginHelper           = this,
             swContextPopupService  = this.serviceMap.swContextPopupService;

         return {
            view     : null,
            execute  : function(/*$document*/) {
               var view = this.view;

               _.result(pluginHelper, 'nota.destroy');

               var notaInitializator = new NotaInitializator(pluginHelper.serviceMap, view, isEditor, pluginHelper.activePopup, isReadingMode);

               pluginHelper.nota = notaInitializator.init(view);
               swContextPopupService.addExerciseChangeListeners({
                  Test : pluginHelper.nota.updateTest,
                  EssayTask : pluginHelper.nota.updateEssayTask
               });
            },
            reset    : function() {
               return _.result(pluginHelper, 'nota.hardReset');
            },
            destroy  : function() {
               return _.result(pluginHelper, 'nota.destroy');
            }
         };
      },

      fragmentSelectorRunner: function(range) {
         var pluginHelper           = this;

         return {
            view     : null,
            execute  : function(/*$document*/) {
               var view = this.view;

               if (pluginHelper.fragmentSelector) {
                  pluginHelper.fragmentSelector.destroy();
               }

               var initializator = new FragmentSelectorInitializator(pluginHelper.serviceMap, range);

               pluginHelper.fragmentSelector = initializator.init(view);
               pluginHelper.fragmentSelector.range = range;
            },
            destroy  : function() {
               if (pluginHelper.fragmentSelector) {
                  pluginHelper.fragmentSelector.destroy();
               }
            }
         };
      },

      fragmentSelectorRenderer: function() {
         var pluginHelper = this;
         return {
            view: null,
            execute: function() {
               pluginHelper.fragmentSelector.setSelection();
            },
            phase: 'onPartialLoad'
         };
      },

      scrollBorder: function($element) {
         var pluginHelper  = this,
             container     = null,
             $topBorder    = null,
             $bottomBorder = null,
             showBorders   = false,
             _reposition   = _.debounce(_repositionImmediately, 500),
             serviceMap    = pluginHelper.serviceMap,
             swScrollFactory     = serviceMap.swScrollFactory,
             swApplicationScroll = serviceMap.swApplicationScroll,
             swUnifiedSettingsService   = serviceMap.swUnifiedSettingsService;

         _init();

         return {
            view     : null,
            destroy  : _destroy,
            execute  : _reposition,
            phase    : 'onPositionChange'
         };

         function _destroy() {
            container = null;
            $topBorder    = null;
            $bottomBorder = null;
            swUnifiedSettingsService.removeOnSettingsChangeListener('ScrollSettings', 'viewScrollBorder', _onChangeVisibility);
         }

         function _init() {
            swUnifiedSettingsService.addOnSettingsChangeListener('ScrollSettings', 'viewScrollBorder', _onChangeVisibility);
            _changeBordersVisibility(swUnifiedSettingsService.getSetting('ScrollSettings', 'viewScrollBorder'));
         }

         function _getScroll() {
            return swScrollFactory.getParentScroll($element) || swApplicationScroll.getScroll();
         }

         function _repositionImmediately() {
            if (!showBorders) {
               return;
            }

            var position = ReadingPosition.getReadingPositionViewport();

            if (!position) {
               return;
            }

            _lazyInit();

            var scrollTop = _getScroll().getScrollTop();
            var borderHeight;
            var containerOffsetTop = $element.position().top;

            if (position.start) {
               var startTop = Math.floor(position.start.top);
               borderHeight  = $topBorder.height();
               startTop = scrollTop - containerOffsetTop + startTop - borderHeight;
               $topBorder.css('transform', 'translateY(' + startTop + 'px)');
            }

            if (position.end) {
               var endBottom  = Math.ceil(position.end.bottom);
               borderHeight  = $bottomBorder.height();
               endBottom = scrollTop - containerOffsetTop + endBottom + borderHeight;
               $bottomBorder.css('transform', 'translateY(' + endBottom + 'px)');
            }

            $element.toggleClass('on-scroll', false);
         }

         function _lazyInit() {
            $topBorder    = $topBorder    || $element.find('.top-border');
            $bottomBorder = $bottomBorder || $element.find('.bottom-border');

            container = container || _.last($element.find('#publication-placeholder > div'));
         }

         function _changeBordersVisibility(flag) {
            _lazyInit();
            showBorders = flag;
            $topBorder.toggleClass('hidden-border-scroll', !showBorders);
            $bottomBorder.toggleClass('hidden-border-scroll', !showBorders);
         }

         function _onChangeVisibility(setting) {
            _changeBordersVisibility(setting.value);
            _repositionImmediately();
         }
      }
   });

   function FragmentSelectorInitializator(serviceMap, range) {
      this.serviceMap = serviceMap;

      //var self = this;

      this.init = function(scrollableElement) {
         var self = this;
         var fragmentSelector = this.generate(scrollableElement, range);

         fragmentSelector.onMenuActivate(function (data, position) {
            self.menuActivate(data, position);
         });
         fragmentSelector.onSelectionComplete(function (data) {
            self.selectionComplete(data);
         });

         self.startSelection = function () {
            fragmentSelector.startSelection();
         };
         self.endSelection = function () {
            fragmentSelector.endSelection();
         };
         self.clearSelection = function () {
            fragmentSelector.clearSelection();
            self.serviceMap.swEditCourseBookItemService.onSelectionUpdate({});
         };
         self.setSelection = function () {
            fragmentSelector.setSelection();
         };

         self.serviceMap.swEditCourseBookItemService.setClearSelection(fragmentSelector.clearSelection);


         return fragmentSelector;
      };
   }

   _.extend(FragmentSelectorInitializator.prototype, {
      generate: function(scrollableElement, range) {
         var widgetData = {
            //_promise: _promise
            range: range
         };

         var widgetSettings = {
            //wrapperClass            : 'fragment-selector-wrapper',
            //courseSidebarClass : 'course-sidebar',
            _modules: {}
         };

         return FragmentSelector.init(scrollableElement, widgetData, widgetSettings);
      },
      menuActivate: function (data, position) {
         var self = this,
            swPopupService = this.serviceMap.swPopupService,
            popup = {hide: _.noop},
            extendScope = {
               extend: {
                  data: data,
                  startSelection: function () {
                     self.startSelection();
                     popup.hide();
                  },
                  endSelection: function () {
                     self.endSelection();
                     popup.hide();
                  },
                  clearSelection: function () {
                     self.clearSelection();
                     popup.hide();
                  }
               }
            };


         popup = swPopupService.show({
            extendScope: extendScope,
            customClass: 'course-popup scrollable' + (extendScope.extend.data.start ? ' course-popup-extended'  : ''),
            template: '<ul class="selecion-range">' +
                        '<li ng-click="extend.startSelection()">Set Selection Start Point</li>' +
                        '<li ng-click="extend.endSelection()" ng-if="extend.data.start">Set Selection End Point</li>' +
                        '<li ng-click="extend.clearSelection()" ng-if="extend.data.start">Clear Selection</li>' +
                     '</ul>',
            requestFocus: false,
            layout: {
               arrow: true,
               my: 'LT',
               at: 'CB',
               of: position
            }
         });
      },
      selectionComplete: function (data) {
         if (!data.end && data.start) {
            data.end = data.start;
         }

         this.serviceMap.swEditCourseBookItemService.onSelectionUpdate(data);
      }

   });

   function NotaInitializator(serviceMap, view, isEditor, activePopup, isReadingMode) {
      this.serviceMap = serviceMap;

      var self = this;

      this.init = function() {
         var nota = this.generate(view, isReadingMode, isEditor);

         var extend = {};

         nota.onSelectionCollapse(function() {
            self.onSelectionCollapse(extend);
         });

         ['onSelectionComplete', 'onAnnotationActivate'].forEach(function(funcName) {
            nota[funcName](function(data) {
               extend = self[funcName](nota, isEditor, view, activePopup, data);
            });
         });

         nota.onTestActivate(function(data) {
            self.onTestActivate(nota, isEditor, data);
         });

         nota.onCommentActivate(function (data) {
            if (isEditor) {
               self.onCommentActivate(nota, isEditor, view, activePopup, data);
            }
         });

         nota.onExerciseRemove(function (data) {
            if (isEditor) {
               self.onExerciseRemove(data);
            }
         });

         nota.onEssayTaskActivate(function(data) {
            self.onEssayTaskActivate(nota, isEditor, data);
         });

         nota.onEssayTaskReaderComplete(function(data) {
            self.onEssayTaskReaderComplete(data);
         });

         nota.onMicroJournallingComplete(function(data) {
            self.onMicroJournallingComplete(data);
         });

         nota.onContentElementActivate(function($contentEl) {
            if (isEditor) {
               self.onContentElementActivate(nota, view, $contentEl);
            }
         });

         nota.onDataChange(function(materialsType, material, eventName) {
            self.onChangeData(materialsType, material, eventName);
         });

         return nota;
      };
   }

   _.extend(NotaInitializator.prototype, {
      generate: function(view, isReadingMode, isEditor) {
         var swReadModeSettingsService = this.serviceMap.swReadModeSettingsService,
             swContentProvider         = this.serviceMap.swContentProvider,
             swScrollFactory           = this.serviceMap.swScrollFactory,
             marginNotesMode = isReadingMode === true && swReadModeSettingsService.getMarginNotesMode(),
             lang = swContentProvider.getLanguage();

         var categories     = swContentProvider.getCategories();
         var microJParaSize = swContentProvider.getMicroJParaSize();

         var widgetSettings = {
            wrapperClass            : 'nota-wrapper',
            textDirection           : (lang === 'en' ? 'ltr' : 'rtl'),
            annotationsSidebarClass : 'marks-sidebar annotation-sidebar',
            bookmarksSidebarClass   : 'marks-sidebar bookmarks-sidebar',

            _modules: {
               annotations : {
                  isSidebarReduced  : !marginNotesMode,
                  categories        : categories
               },
               test : {
                  parseTemplate : parseTemplate.bind(this, isEditor, 'quiz'),
                  calculateQuizeSize : calculateQuizeSize.bind(this),
                  openDescription : openDescription.bind(this)
               },
               essayTask: {
                  parseTemplate : parseTemplate.bind(this, isEditor, 'essayTask')
               },
               comments: {
                  categories    : categories
               },
               bookmarks: {
                   canChangeBookmarks: isEditor
               },
               microJournalling: {
                  paraSize: (!isEditor ? microJParaSize : ''),
                  parseMicroJurTemplate: parseMicroJurTemplate.bind(this)
               },
               discussionTasks: {
                  getTemplate: getDiscussionTemplateFunction(this)
               },
               classDiscussions: {
                  getTemplate: getDiscussionTemplateFunction(this)
               },
               selection: {
                  className: 'nota-wrapper',
                  tapDelayGetter: function() {
                     var isTextScrollingOn = swReadModeSettingsService.getScrollSettings('textScrolling');
                     return isTextScrollingOn ? 500 : 0;
                  },
                  scrollFactory: swScrollFactory,
                  active   : '#6db2e9',
                  inactive : '#b2b2b2'
               }
            }
         };

         return Nota.init(view, widgetSettings);
      },

      getCategories: function() {
         var swContentProvider = this.serviceMap.swContentProvider;
         return swContentProvider.getCategories();
      },

      onSelectionComplete: function(nota, isEditor, view, activePopup, selection) {
         var serviceMap = this.serviceMap,
             swContextPopupService = serviceMap.swContextPopupService,
             swPublicationsService = serviceMap.swPublicationsService,
             swContentProvider = serviceMap.swContentProvider,
             swCopyService = serviceMap.swCopyService,
             swReaderService = serviceMap.swReaderService,
             swSidebarReadingPositionService = serviceMap.swSidebarReadingPositionService,
             $window = serviceMap.$window,
             notaInitializator = this;

         var layouter = getLayouter(function() {
            var selectionHighlights = nota.getSelectionHighlights();
            return selectionHighlights.length ? view.getRectangleFor(selectionHighlights) : null;
         });

         var details = swContentProvider.getDetails();
         var data = details.type === 'StudyGuide' ? details.book : details;
         var paragraphId = $("#" + selection.start.id).data( "id" );
         var link = swPublicationsService.externalLink(swReaderService.getBookKey(), selection.start.id);
         var isAuthorInTitle = swPublicationsService.isAuthorInBookTitle(data.author, data.name, data.language);
         var copyTextObj = {};
         var copyFunction = function (event) {
            swCopyService.copyListener(event, copyTextObj);
            extend.extend.closePopup(true);
         };
         var $scope = serviceMap.$scope;

         if ($window.cordova) {
            copyTextObj.plain = selection.textContent + "\r\n";
            copyTextObj.plain += swCopyService.getPlainText(data.author, data.name, paragraphId, isAuthorInTitle);
         }
         else {
            var highlights = nota.getSelectionHighlights();
            copyTextObj = swCopyService.getTextForCopy(highlights, link, data.author, data.name, paragraphId, isAuthorInTitle);
            $window.document.addEventListener('copy', copyFunction);
         }

         serviceMap.swPublicationAudioManager.pause();

         var extend = {
            extend: {
               isTeacher: $scope.readingApi.isTeacher,
               allowDiscussions: $scope.readingApi.allowDiscussions,
               isAdvancedSearch: serviceMap.isAdvancedSearch,
               classId: $scope.readingApi.classId,
               isModal: false,
               action: 'Edit',
               isEditor: isEditor,
               bookmarkExist: nota.bookmarkExist(selection),
               lookupString: selection.textContent,
               publicationId: data.id,
               coverId: data.cover,
               link: link,
               publicationAuthor: data.author,
               publicationName: data.name,
               copyText: copyTextObj.plain,
               layout: layouter,
               locator: selection.start.id,
               popupClose: function () {
                  nota.reset();
                  $window.document.removeEventListener('copy', copyFunction);
               },
               updateLayout: null,
               closePopup: function () {},
               clearUpdateLayout: function () {
                  extend.extend.updateLayout = null;
               },
               deleteItem: function() {
                  /*console.log(obj);*/
               },
               updateCategory: function (oldCategory, newCategory) {
                  nota.updateSettings(notaInitializator.getCategories());
                  nota.updateCategory(oldCategory, newCategory);
               },
               removeCategory: function (category) {
                  nota.removeCategory(category);
               },
               removeCopyHandler: function(){
                  $window.document.removeEventListener('copy', copyFunction);
               }
            },
            location: {
               start: selection.start,
               end: selection.end
            },
            callback: function(data) {
               if (Array.isArray(data)) {
                  selection.category = data[0].category;
                  selection.note = data[0].note;
               }
               var locator;
               switch (data.type) {
                  case 'note':
                     nota.updateSettings(notaInitializator.getCategories());
                     nota.addAnnotation(selection);
                     break;
                  case 'comment':
                     selection.position = data[0].position;
                     nota.updateSettings(notaInitializator.getCategories());
                     nota.addComment(selection);
                     break;
                  case 'mark':
                     nota.toggleBookmark(selection);
                     break;
                  case 'quiz':
                  case 'flashcard':
                     nota.updateTest(data[0]);
                     break;
                  case 'essay':
                     nota.updateEssayTask(data[0]);
                     break;
                  case 'discussion':
                     nota.updateDiscussion(data);
                     break;
                  case 'audio':
                     serviceMap.swPublicationAudioManager.play(extend.location);
                     break;
                  case 'reset-reading':
                     locator = Locator.deserialize(data.locator.slice('para_'.length) + '.0');
                     ReadingPosition.resetReadingPosition(locator);
                     swSidebarReadingPositionService.updatePosition(locator);
                     view.handleViewportResize(false);
                     break;
                  default:
               }
            }
         };

         activePopup.extend = extend.extend;
         swContextPopupService.showPopup(extend);

         return extend;
      },

      onSelectionCollapse: function(extend) {
         if (extend.extend && extend.extend.closePopup) {
            extend.extend.removeCopyHandler();
            extend.extend.closePopup();
            extend.extend.clearUpdateLayout();
         }
      },

      onAnnotationActivate: function(nota, isEditor, view, activePopup, annotation) {
         var notaInitializator = this,
             swContextPopupService = this.serviceMap.swContextPopupService,
             $annotationHighlights = $(annotation.highlights);

         var layouter = getLayouter(function() {
            return view.getRectangleFor($annotationHighlights);
         });

         // TODO: move into nota (!!!!)
         var activeAnnotationClassName = 'nota-annotation-selected';
         var $annotationSidebarElement = $annotationHighlights.closest('body')
            .find('.annotation-sidebar')
            .find('[data-annotation-id="' + annotation.id + '"]');
         $annotationHighlights.addClass(activeAnnotationClassName);
         $annotationSidebarElement.addClass(activeAnnotationClassName);

         var extend = {
            extend: {
               isModal: true,
               isEditor: isEditor,
               isAdvancedSearch: this.serviceMap.isAdvancedSearch,
               layout: layouter,
               popupClose: function () {
                  nota.reset();
                  $annotationHighlights.removeClass(activeAnnotationClassName);
                  $annotationSidebarElement.removeClass(activeAnnotationClassName);
               },
               updateLayout: null,
               closePopup: function () {},
               clearUpdateLayout: function () {
                  extend.extend.updateLayout = null;
               },
               deleteItem: function() {
                  // $annotationHighlights.removeClass(activeAnnotationClassName);
                  extend.extend.closePopup();
                  nota.removeAnnotation(annotation);
               },
               updateCategory: function (oldCategory, newCategory) {
                  nota.updateSettings(notaInitializator.getCategories());
                  nota.updateCategory(oldCategory, newCategory);
               },
               removeCategory: function (category) {
                  nota.removeCategory(category);
               }
            },
            location: {
               start: annotation.start,
               end: annotation.end
            },
            callback: function(data) {
               //console.log(data);
               annotation.category = data[0].category;
               annotation.note = data[0].note;
               nota.updateSettings(notaInitializator.getCategories());
               nota.updateAnnotation(annotation);
               // $annotationHighlights.removeClass(activeAnnotationClassName);
            }
         };

         activePopup.extend = extend.extend;
         swContextPopupService.showPopup(extend, 'note', [annotation]);

         return extend;
      },

      onCommentActivate: function(nota, isEditor, view, activePopup, comment) {
         var notaInitializator = this,
             swContextPopupService = this.serviceMap.swContextPopupService;

         var layouter = getLayouter(function() {
            return view.getRectangleFor(comment.$el);
         });

         var extend = {
            extend: {
               isModal: true,
               isEditor: isEditor,
               layout: layouter,
               popupClose: function () {
                  nota.reset();
               },
               updateLayout: null,
               closePopup: function () {},
               clearUpdateLayout: function () {
                  extend.extend.updateLayout = null;
               },
               deleteItem: function() {
                  extend.extend.closePopup();
                  nota.removeComment(comment);
               },
               updateCategory: function (oldCategory, newCategory) {
                  nota.updateSettings(notaInitializator.getCategories());
                  nota.updateCategory(oldCategory, newCategory);
               },
               removeCategory: function (category) {
                  nota.removeCategory(category);
               }
            },
            location: {
               start: comment.start,
               end: comment.start
            },
            callback: function(data) {
               comment.category = data[0].category;
               comment.note = data[0].note;
               var shouldUpdatePosition = data[0].position !== comment.position;
               comment.position = data[0].position;
               nota.updateComment(comment, shouldUpdatePosition);
               nota.updateSettings(notaInitializator.getCategories());
            }
         };

         activePopup.extend = extend.extend;
         swContextPopupService.showPopup(extend, 'comment', [comment]);

         return extend;
      },

      onTestActivate: function(nota, isEditor, data) {
         var swContextPopupService  = this.serviceMap.swContextPopupService,
             swQuizzesAssessmentService = this.serviceMap.swQuizzesAssessmentService,
             swStudyFlashcardsService = this.serviceMap.swStudyFlashcardsService,
             swFlashcardsAssessmentService = this.serviceMap.swFlashcardsAssessmentService,
             swUserStudyService = this.serviceMap.swUserStudyService;
         if (isEditor) {
            var extend = {
               extend: {
                  locator: data.locator,
                  popupClose: function () {
                     nota.reset();
                  }
               },
               callback: function (data) {
                  nota.updateTest(data[0]);
               }

            };
            swContextPopupService.showPopup(extend, (data.testType === 'Flashcard' ? 'flashcard' : 'quiz'), data);
         }
         else {
            var testId = data._id;

            switch (data.testType) {
               case 'Flashcard':
                  if (data.active)
                  {
                     return false;
                  }
                  else
                  {
                     //debugger;//service client - NOT TESTED
                     if(!data.active){
                        data.active = true;
                        swStudyFlashcardsService.activateTestQuestionsStudies(testId, this.serviceMap.swReaderService.getBookKey().studyItemId)
                            .then(function (response) {
                               swFlashcardsAssessmentService.startAssessment(response, data);
                               var params = {
                                 id                  : data._id,
                                 active              : data.active,
                                 locator             : data.locator,
                                 testType            : data.testType
                               };
                               swContextPopupService.updateExercise(data);
                               swUserStudyService.persistFlashCard(params);
                            });
                     }
                  }

                  break;

               case 'Quiz':
                  swQuizzesAssessmentService.startAssessment(testId, data.publicationId)
                      .then(function (test) {
                        //debugger;//service client - result is not used
                        swUserStudyService.persistTest(test);
                      });
                  break;
            }
         }
      },

      onEssayTaskActivate: function(nota, isEditor, data) {
         var swContextPopupService  = this.serviceMap.swContextPopupService;
         if (isEditor) {
            var extend = {
               extend: {
                  locator: data.locator,
                  popupClose: function () {
                     nota.reset();
                  }
               },
               callback: function (data) {
                  nota.updateEssayTask(data[0]);
               }
            };
            swContextPopupService.showPopup(extend, 'essay', data);
         }
      },

      onEssayTaskReaderComplete: function (data) {
         var swUserStudyService = this.serviceMap.swUserStudyService;
         data.completed = data.wordsLimit <= data.wordsNumber;
         swUserStudyService.persistEssay({
            essayId  : data._id,
            text     : data.text,
            completed : data.completed
         });
      },

      onExerciseRemove: function (data) {
         if (data.type === 'Test') {
            this.serviceMap.swManageTestsService.removeTests(data._id);
         }
         else if (data.type === 'EssayTask') {
            this.serviceMap.swManageEssayTasksService.removeEssayTask(data._id);
         }
         data.remove = true;
         this.serviceMap.swContentProvider.onMaterialsChange(data.type, data, 'remove');
      },

      onMicroJournallingComplete: function (data) {
         var swUserStudyService = this.serviceMap.swUserStudyService;
         swUserStudyService.persistParagraphSummary({
            locator     : { paragraphId : data.locator.paragraphId },
            recordedAt  : _.now(),
            text        : data.text
         });
      },

      onContentElementActivate: function(nota, view, para) {
         var notaInitializator = this,
             swContextPopupService = this.serviceMap.swContextPopupService;

         var layouter = getLayouter(function() {
            return view.getRectangleFor($('#' + para));
         });

         var selection = {};
         selection.start = selection.end = {
            id: para
         };

         var extend = {
            extend: {
               isAside: true,
               isModal: true,
               isEditor: true,
               bookmarkExist: nota.bookmarkExist(selection),
               layout: layouter,
               locator: selection.start.id,
               popupClose: function () {
                  //nota.reset();
               },
               updateLayout: null,
               closePopup: function () {},
               clearUpdateLayout: function () {
                  extend.extend.updateLayout = null;
               },
               deleteItem: function() {
                  /*console.log(obj);*/
               },
               updateCategory: function (oldCategory, newCategory) {
                  nota.updateSettings(notaInitializator.getCategories());
                  nota.updateCategory(oldCategory, newCategory);
               },
               removeCategory: function (category) {
                  nota.removeCategory(category);
               }
            },
            location: {
               start: selection.start,
               end: selection.end
            },
            callback: function(data) {
               selection.category = data[0].category;
               selection.note = data[0].note;

               switch (data.type) {
                  case 'comment':
                     selection.position = data[0].position;
                     nota.updateSettings(notaInitializator.getCategories());
                     nota.addComment(selection);
                     break;
                  case 'mark':
                     nota.toggleBookmark(selection);
                     break;
                  case 'quiz':
                  case 'flashcard':
                     nota.updateTest(data[0]);
                     break;
                  case 'essay':
                     nota.updateEssayTask(data[0]);
                     break;
                  default:
               }
            }
         };
         swContextPopupService.showPopup(extend);

         return extend;
      },

      onChangeData: function(materialsType, material, eventName) {
         var swContentProvider = this.serviceMap.swContentProvider;
         swContentProvider.onMaterialsChange(materialsType, material, eventName);
      }
   });

   function getLayouter(rectangulator) {
      return function() {
         var cr = rectangulator();

         return cr && {
            arrow: true,
            my: 'LT',
            at: 'CB',
            of: {
               clientRect: cr
            },
            collision: {
               rotate: false
            },
            margin: {
               top: 40
            }
         };
      };
   }

   function parseMicroJurTemplate(value) {
      _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
      value.text = value.text || '';
      value.wordsNumber = value.wordsNumber || 0;
      return _.template(microJournallingTemplate)(value);
   }

   var descriptionBlockOpen = {};
   function openDescription(testId){
      var toggle = !descriptionBlockOpen[testId] ? descriptionBlockOpen[testId] = true : descriptionBlockOpen[testId] = false;
      return toggle;
   }

   var calculateNumberLines = function($currentElement){
      var titleHeight = $currentElement.height();
      var titleLineHeight = parseInt($currentElement.css('line-height').replace('px', ''), 10);
      titleLineHeight = isNaN(titleLineHeight) ? 1 : titleLineHeight;
      var numberLines = Math.round(titleHeight / titleLineHeight);
      return numberLines;
   };

   var cutLines = function(element, className, maxNumberLines, isExpandedDescription){
      var $currentElement = element.find(className);
      var numberLines = calculateNumberLines($currentElement);
      var content = $currentElement.text();
      var tempContent = '';
      var lastSpace = -1;
      var arrow = element.find('.arrow');
      if(numberLines > maxNumberLines){
         for(var i = 1; i < content.length; i++){
            tempContent = content.substring(0, i);
            $currentElement.text(tempContent);
            numberLines = calculateNumberLines($currentElement);
            if(numberLines > 2){
               break;
            }
         }
         content = content.substring(0, i);
         lastSpace = content.lastIndexOf(' ');
         lastSpace = lastSpace !== -1 ? lastSpace : i;
         content = content.substring(0, lastSpace - 3) + '...';
         $currentElement.text(content);
         arrow.removeClass('hidden');
      }
      else if ( !isExpandedDescription ) {
         arrow.addClass('hidden');
      }
      return element;
   };

   function calculateQuizeSize(element, isExpandedDescription){
      element = cutLines(element,'.test-title', 2, isExpandedDescription);
      if(!isExpandedDescription){
         element = cutLines(element,'.test-description', 2, isExpandedDescription);
         element.find('.arrow').removeClass('dropped');
      }
      return element;
   }

   function parseTemplate(isEditor, templateType, value) {
      _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
      var template;
      var getProgress = function (data) {
         return {
            current: data.correctAnswersCount || 0,
            full: data.testQuestions ? data.testQuestions.length : data.testQuestionsCount,
            get progressStr() {
               var progress = '';
               if (data.testType === 'Flashcard') {
                  progress = this.full;
               }
               else if (data.testType === 'Quiz') {
                  progress = isEditor ? this.full : (this.current + '/' + this.full);
               }
               return progress;
            },
            get title() {
               return data.testType === 'Flashcard' ? 'Decks:' : 'Questions:';
            },
            get className() {
               var className = 'not_started';
               if (data.testType === 'Flashcard') {
                  className = data.active ? 'completed' : 'not_started';
               }
               else if (data.testType === 'Quiz') {
                  className = this.current === this.full ? 'completed' :
                                    this.current > 0 ? 'in-progress' : 'not_started';
               }
               return className;
            }
         };
      };
      if (templateType === 'quiz') {
         value.progress = getProgress(value);
         value.isRemoveIconShows = isEditor;
         template = quizTemplate;
         value.state = isEditor ? 'Edit' : 'Start';
      }
      else if (templateType === 'essayTask') {
         if (isEditor) {
            template = essayTaskTemplate;
         }
         else {
            value.progress = getProgress(value);
            value.comment = value.comment ? value.comment : '';
            value.text = value.text || '';
            value.wordsLimit = parseInt(value.wordsLimit, 10);
            value.wordsNumber = value.wordsNumber || 0;
            template = essayTaskReaderTemplate;
            return _.template(template)(value);
         }
      }
      else if (templateType === 'nextPublicationButton') {
         template = nextPublicationButtonTemplate;
      }
      else if (templateType === 'prevPublicationButton') {
         template = prevPublicationButtonTemplate;
      }

      return _.template(template)(value);
   }

   function getDiscussionTemplateFunction(self) {
      return function (data, removeFn) {
         return getDiscussionTemplate.apply(null, [self, data, removeFn]);
      };
   }

   function getDiscussionTemplate(self, data, removeFn) {
      var studyClassSettings = self.serviceMap.swStudyClassService.getStudyClassSettings();
      var scope = self.serviceMap.$scope;
      if (isDiscussionsDisabled(scope, studyClassSettings)) {
         return '';
      }
      if (!scope.discussionData) {
         scope.discussionData = {};
      }
      if (typeof scope.removeDiscussion !== 'function') {
         scope.removeDiscussion = removeFn;
      }

      scope.discussionData[data._id] = data;
      return self.serviceMap.$compile('<sw-discussion data="discussionData[\'' + data._id + '\']" remove="removeDiscussion(id)"></sw-discussion>')(scope);
   }

   function isDiscussionsDisabled(scope, studyClassSettings) {
      return !scope.isEditor && (studyClassSettings.isIndependentStudy || !studyClassSettings.isDiscussionsAllow);
   }

});
