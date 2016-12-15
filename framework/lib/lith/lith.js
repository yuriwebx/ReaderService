/* globals console */
define(['underscore', 'jquery',
   'publication/reading-position',
   'publication/locator',
   'publication/dom-utils/marker-utils',
   'lith/virtual-scroll'
], function(_, $, ReadingPosition, Locator, MarkerUtils, LithVirtualScroll) {
   'use strict';

   /* jshint browser:true */
   /* jshint validthis:true */
   /* jshint laxbreak:true */
   /* jshint bitwise:true */
   /* jshint newcap:true */
   /* jshint -W030 */
   /* jshint -W068 */


   // magic numbers, other global widget settings
   var BOOK_HEIGHT_CHECK_INTERVAL = 50; // ms
   var CONTAINER_ID = 'publication-placeholder';

   // specialized plugins
   var themePlugin = function() {
      return {
         name: 'theme',
         view: null,
         execute: function(cssRules) {
            if (this.view === null) {
               return;
            }

            if (!cssRules) {
               this.view.injectStyles('');
               return;
            }

            var cssRulesToApply;
            if ($.isArray(cssRules)) { // legacy special case
               cssRulesToApply = cssRules.map(function(rule) {
                  var declarations = _.map(rule.declarations, function(val, prop) {
                     var normalizedProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                     return normalizedProp + ':' + val.replace(/"/g, '') + ';';
                  });
                  return patchSelector(rule.selector) + '{' + declarations.join(' ') + '}';
               });
            }
            else { // cssRules stores styleDeclaration as a plain string, should apply it to 'body'
               cssRulesToApply = ['#' + CONTAINER_ID + '{' + cssRules + '}'];
            }

            this.view.injectStyles(this.name, cssRulesToApply.join('\n'));
         }
      };
   };

   var fontSizePlugin = function() {
      return {
         name: 'fontSize',
         view: null,
         execute: function(options) {
            if (this.view) {
               var fontSize = parseInt(options.value, 10);
               var lineHeight = parseFloat(options.lineHeight, 10) || 0;
               lineHeight = Math.max(1, lineHeight);
               var firstLetterHeight = 2 * lineHeight;

               var styles = [
                  '#', CONTAINER_ID, '>div {font-size:', fontSize, '%; line-height:', lineHeight + 'em;}',
                  ' ',
                  '#', CONTAINER_ID, ':not(.bh-line-height_2):not(.bh-line-height_3) .bh-first-letter {font-size:', firstLetterHeight, 'em;}'
               ];

               this.view.scheduleInjectStyles(this.name, fontSize ? styles.join('') : '');
               this.view.notifyAboutUpdate(true);
            }
         }
      };
   };

   var fontFamilyPlugin = function() {
      return {
         name: 'fontFamily',
         view: null,
         execute: function(styles) {
            if (this.view) {
               var stringStyles = _.reduce(styles, function(memo, val, key) {
                  memo += key + ': ' + val + '; ';
                  return memo;
               }, '');

               stringStyles = '#' + CONTAINER_ID + '{' + stringStyles + '}';

               this.view.scheduleInjectStyles(this.name, stringStyles);
            }
         }
      };
   };

   /**
    * PUBLIC METHODS
    */
   return {
      createAt: createWidgetAt,
      openBook: openWidgetWithBook
   };

   function createWidgetAt($element, plugins, errorHandler) {
      // workaround: till the app structure is normalized,
      // allows just to use cached instance instead
      if (hasWidgetAttached($element)) {
         return retrieveWidget($element);
      }

      var _state = new WidgetState($element, errorHandler);

      var _widget = {};
      return storeWidget($element, $.extend(_widget, {
         destroy: destroyWidget,
         initSettings: initWidgetSettings.bind(_widget, _state),
         updateSettings: updateWidgetSettings.bind(_widget, _state),

         initPlugins: initWidgetPlugins.bind(_widget, _state),
         loadBookData: loadBookDataIntoWidget.bind(_widget, _state),
         clearBookData: clearBookDataFromWidget.bind(_widget, _state),
         repositionTo: function _repositionTo(locator) {
            var plugins = _.result(_state, 'plugins');
            _.each(plugins, function(plugin) {
               _.result(plugin, 'reset');
            });

            return _safeCaller(_state, 'view.repositionTo', locator);
         },

         // compatibility
         setBookStyles: function(styles) {
            return this.updateSettings(
               $.isArray(styles) ? {theme:styles} : {fontFamily: styles.declarations['font-family']});
         },
         on: function() { return _widget; },
         pauseMediaOverlay: $.noop,
         handleViewportResize: handleViewportResizeByWidget.bind(_widget, _state),
         setScroll: function _setScroll(scrollTop) {
            return _safeCaller(_state, 'view.setScroll', scrollTop);
         }
      })).initPlugins(plugins);

      function destroyWidget() {
         if (_state) {
            _.each(_state.plugins, function(plugin) {
               if ($.isFunction(plugin.destroy)) {
                  plugin.destroy();
               }
            });
            _.result(_state, 'view.destroy');
            _state.view = null;
            unstoreWidget($element);
            _state = null;
         }
      }
   }

   function openWidgetWithBook($element, target, settings, plugins, onload, scroll) {
      return createWidgetAt($element, plugins)
            .initSettings(settings)
            // .initPlugins(plugins)
            .loadBookData(target, onload, scroll);
   }

   function WidgetState($element, errorHandler) {
      this.$element = $element; // element wrapped by the widget
      this.book     = null; // book-related static data: description, coverUrl, toc etc.
      this.view     = null; // view instance etc.
      this.settings = {};   // cache settings object
      this.plugins  = [];   // plugins to be used
      this.errors   = [];   // errors to be shown to a user if something goes wrong
      this.errorHandler = ($.isFunction(errorHandler)
         ? errorHandler
         : (function() {
            console.log(this.errors);
            this.errors = [];
         })
      ).bind(this);
   }

   /** PLUGINS **/
   // this doesn't trigget specific actions
   function initWidgetSettings(_state, settings) {
      _state.settings = $.extend(true, {}, settings);
      return this;
   }

   function initWidgetPlugins(_state, plugins) {
      if ($.isArray(_state.plugins)) {
         _.each(_state.plugins, function(plugin) {
            if ($.isFunction(plugin.destroy)) {
               plugin.destroy();
            }
         });
      }
      _state.plugins = [];
      if (!$.isArray(plugins)) {
         plugins = [];
      }

      plugins.push(themePlugin(), fontSizePlugin(), fontFamilyPlugin());

      Array.prototype.push.apply(_state.plugins, plugins);

      return this;
   }
   function updateWidgetSettings(_state, settings, silent) {
      if (!_state.view || !_state.view.getScrollableElement()) {
         return this;
      }
      settings = settings || {};
      $.extend(true, _state.settings, settings);
      _.each(settings, function(data, pluginName) {
         var plugin = _.findWhere(_state.plugins, {name: pluginName});
         if (plugin) {
            plugin.execute(data);
         }
      });
      if (!silent) {
         _state.view.notifyAboutUpdate();
      }
      return this;
   }

   function handleViewportResizeByWidget(_state, params) {
      if (_state.view) {
         return _state.view.handleViewportResize(params);
      }
   }

   /** INSTANCE-REGISTRY **/
   function storeWidget($element, $widget) {
      // assert isWidgetAttach($element) === false
      $.data($element[0], 'lith', $widget);
      return $widget;
   }

   function retrieveWidget($element) {
      return $.data($element[0], 'lith');
   }

   function unstoreWidget($element) {
      $.removeData($element[0], 'lith');
   }

   function hasWidgetAttached($element) {
      return retrieveWidget($element) !== undefined;
   }

   function clearBookDataFromWidget(_state) {
      if (_state.view) {
         _state.view.destroy();
      }
      _state.book = null;
      return this;
   }

   /** FETCHERS **/
   function loadBookDataIntoWidget(_state, target, onLoadBook, scroll) {
      var _widget = this;

      var view = _state.view;
      // one can load additional plugins based on bookDocument
      // or activate the existing ones

      // var unescChapterHref;
      scroll.preventScrollHandling();

      _state.plugins.forEach(function(plugin) {
         _.result(plugin, 'reset');
      });

      if (!(view instanceof ScrollableView)) {
         view && view.destroy();
         _state.view = view = new ScrollableView(_state.$element, _state.settings, _state.plugins,
            target.contentProvider, scroll);
      }

      view.navigateTo({
         fileUrl: '',
         locator: target.locator
      });

      if (target.readingPosition) {
         ReadingPosition.restoreReadingPosition(target.readingPosition);
      }

      onLoadBook();
      return _widget;
   }

   // views
   function ScrollableView(_$element, settingsRef, pluginsRef, contentProvider, scroll) {
      var _locator = null;

      var _schedulers   = [];
      var _processors   = {
         onPartialLoad: [], // fired when each piece of content is injected into DOM (and should be redecorated)
         onLoad:   [], // fired immediately after the loaded content has been put into DOM
         onStable: [], // fired when the content's height is stable (no longer changes)
         onPositionChange: [], // fired when the reading position is changed (because of a user action)
         onLayoutChange:   [] // fired when the layout is changed
      };
      var _activeProcessor = '';

      var _$scrollWidget = null;
      var _$placeholder = $('<div id="publication-placeholder"></div>').appendTo(_$element);
      var _$container = _$placeholder;

      var _view = Object.create(ScrollableView.prototype);
      var _viewIsReady = false;

      // for each plugin given, register a specific set of processor functions
      pluginsRef.forEach(function(plugin) {
         var phase = plugin.phase || 'onLoad';
         if ('view' in plugin) {
            plugin.view = _view;
         }

         _processors[phase].push(
            plugin.name
               ?  plugin.execute.bind(plugin, settingsRef[plugin.name])  // external plugins
               :  plugin.execute.bind(plugin)                            // utility plugins
         );
      });
      ReadingPosition.initialize(function() {
         return scroll.getScrollableElementRect();
      }, {
         shouldDetectReadingPosition: settingsRef.shouldDetectReadingPosition,
         /*positionHighlightClass: {
            min: 'nota-annotation-cat-52-65-72-65-61-64',
            max: 'nota-annotation-cat-48-69-67-68-6c-69-67-68-74'
         },*/
         progressTracker: settingsRef.readingProgressTracker
      });

      return $.extend(_view, {
         destroy: function() {
            _$scrollWidget && _$scrollWidget.destroy();
            _$scrollWidget = null;
            _$placeholder.remove();
            _$placeholder = null;
            // TODO: a proper destroy mechanism for ReadingPosition
         },
         navigateTo: navigateTo,
         injectStyles: injectStyles,
         scheduleInjectStyles: scheduleInjectStyles,
         handleViewportResize: handleViewportResize,
         notifyAboutUpdate: notifyAboutUpdate,
         hideBook: hideBook,
         showBook: showBook,
         getScrollableElement: function() {
            return _.result(_$scrollWidget, 'getScrollableElement');
         },
         setContainerElement: function($container) {
            _$container = $container;
         },
         getContainerElement: function() {
            return _$container;
         },
         decorateBlockWithPlugins: function(materials, $para) {
            if (_$scrollWidget) {
               _partialLoadHandler(materials, $para);
            }
         },
         finalizeLoading: function(materials) {
            if (_$scrollWidget) {
               _partialLoadHandler(materials);
            }
         },
         getRectangleFor: getRectangleFor,
         repositionTo: function _repositionTo(locator) {
            _safeCaller(_$scrollWidget, 'alignViewportByLocator', locator);
            _scrollHandler();
         },
         setScroll: function _setScroll(_scroll) {
            scroll = _scroll;
            _safeCaller(_$scrollWidget, 'setScroll', scroll);
         }
      });

      function getRectangleFor($el) {
         var last = $el.length -1;
         var clientRectangle = $el[last].getBoundingClientRect();

         // more details at https://irls.isd.dp.ua/redmine/issues/1923
         var left = Math.max(clientRectangle.left, $el[last].offsetLeft);
         var width = Math.min($el.width(), clientRectangle.right - left);
         return {
            left: left,
            top: clientRectangle.top,
            width: width,
            height: $el.height()
         };
      }

      // exposed methods
      function navigateTo(target) {
         _locator = target.locator;
         if (_viewIsReady) {
            repositionBook();
            _scrollHandler();
         }
         else {
            loadBook();
         }
      }

      function loadBook() {
         hideBook();
         _.result(_$scrollWidget, 'destroy');
         _$scrollWidget = new LithVirtualScroll(_view, contentProvider, scroll);
         _$scrollWidget.addPositionChangeHandler(_scrollHandler);
         _loadHandler();
      }

      function hideBook() {
         _$placeholder.css('opacity', 0);
         _viewIsReady = false;
      }

      function showBook() {
         _viewIsReady = true;
         _$placeholder.css('opacity', 1);
         scroll.resumeScrollHandling();
         repositionBook();
      }

      function repositionBook(reload) {
         if (_$scrollWidget && scroll.isActive()) {
            _$scrollWidget.alignViewportByLocator(_locator, reload);
            //_scrollHandler();
            //var range = getFirstLastParagraphs();
            //var progressInWords = getProgressInWords(range.last);
            _executeProcessors('onLayoutChange');
         }
      }

      function getProgressInWords(locator) {
         if (locator instanceof Locator.PublicationStartLocator) {
            return 0;
         }

         var progressAttr = 'data-before';
         var lastProgressAttr = 'data-words-count';
         var currentElement = MarkerUtils.getParagraphById(locator.paragraphId, _$container[0]);

         /* jshint bitwise:false */
         var progress = (currentElement.getAttribute(progressAttr) | 0) + (currentElement.getAttribute(lastProgressAttr) | 0);
         /* jshint bitwise:true */
         return progress;
      }

      /**
       *
       *
       * @param {PublicationStartLocator|InTextLocator} locator
       * @returns {?string}
       * @private
       */
      function _getChapterIdByLocator(locator) {
         var chapterId = null;
         if (locator instanceof Locator.PublicationStartLocator) {
            return chapterId;
         }

         var paragraphElement = MarkerUtils.getElementByLocator(locator);
         /* jshint -W084 */
         do {
            chapterId = paragraphElement.getAttribute('data-chapter');
            if (chapterId !== null) {
               break;
            }
         } while (paragraphElement = MarkerUtils.getPreviousParagraph(paragraphElement));
         /* jshint +W084 */
         return chapterId;
      }

      function injectStyles(pluginId, styleString) {
         var styles = {};
         styles[pluginId] = styleString;
         _injectStyles(_$placeholder[0].ownerDocument, styles);
         /*if (_viewIsReady) {
          _repositionFrame(false);
          }*/
      }

      function scheduleInjectStyles(pluginId, styleString) {
         if (_activeProcessor === 'onLoad') {
            injectStyles(pluginId, styleString);
         }
         else {
            _schedulers.push(injectStyles.bind(_view, pluginId, styleString));
         }
      }

      function handleViewportResize(widthHasChanged) {
         if (widthHasChanged) {
            notifyAboutUpdate();
         }
         else {
            _scrollHandler();
         }
      }

      function notifyAboutUpdate(reload) {
         _schedulers.forEach(function (cb) {
            cb();
         });
         _schedulers.length = 0;
         _$scrollWidget && _$scrollWidget.updateContentHeight(_$placeholder);
         ReadingPosition.updateViewportRectangle();
         var $focusedEl = _$placeholder.find('input:focus, textarea:focus');

         if (settingsRef.isTouch && $focusedEl.length) {
            _$scrollWidget.alignViewportByElement($focusedEl[0]);
         }
         else {
            repositionBook(reload);
         }
      }

      // privates
      function _executeProcessors() {
         // assert (eventName in plugins)
         // console.log(eventName + ' processors are fired');
         var eventName = arguments[0];
         var args = Array.prototype.slice.call(arguments, 1);
         _activeProcessor = eventName;

         _processors[eventName].forEach(function(processor) {
            processor.apply(this, args);
         });
      }

      function _loadHandler() { // fired when the frame stopped loading content
         _$placeholder.children().on({
            click: function(ev) {
               // disabling all the links
               var $target = $(ev.target);
               if ($target.closest('a').length !== 0) {
                  ev.preventDefault();
               }
            }
         });
         _executeProcessors('onLoad', _$placeholder);
         ReadingPosition.setContentContainer(_$container[0]);
         ReadingPosition.updateViewportRectangle();
         _scheduleBookHeightCheck();
      }

      function _partialLoadHandler(materials, $paragraph) {
         _executeProcessors('onPartialLoad', materials, $paragraph);
      }

      function _scrollHandler() { // params seem to be of no use here
         if (!_viewIsReady) {
            return;
         }

         // _scrollHandler called in debounce, so scroll can be already destroyed
         if (!(_$placeholder && _$placeholder[0].ownerDocument.defaultView) || !scroll.isActive()) {
            return;
         }

         var readingArea = ReadingPosition.updateReadingArea();
         // console.log('readingArea is ', readingArea.toJSON());
         _locator = readingArea.startLocator;
         var positionChangeData = {
            locator: _locator,
            pessimisticReadingPosition: ReadingPosition.getPessimisticReadingPosition(),
            optimisticReadingPosition: ReadingPosition.getOptimisticReadingPosition(),
            progressInWords: getProgressInWords(readingArea.endLocator),
            chapterId: _getChapterIdByLocator(readingArea.startLocator)
         };
         positionChangeData.isFirstPage = readingArea.startLocator instanceof Locator.PublicationStartLocator;
         positionChangeData.isLastPage = ReadingPosition.isPublicationEnd(readingArea.endLocator);
         if (ReadingPosition.scrolledTooFar()) {
            positionChangeData.readingPosition = ReadingPosition.getReadingPosition();
         }
         _executeProcessors('onPositionChange', positionChangeData);
      }

      // function _resizeHandler() {
      //    _$scrollWidget.updateContentHeight(_$placeholder);
      //    repositionBook();
      // }

      function _stableHandler() {
         _$scrollWidget.updateContentHeight(_$placeholder);
         ReadingPosition.updateViewportRectangle();
         _executeProcessors('onStable');
         showBook();
         _activeProcessor = '';
      }

      function _scheduleBookHeightCheck() {
         var prevHeight = 0;
         setTimeout(function bookHeightCheck() {
            if (!_$placeholder) {
               return;
            }

            if (prevHeight === _$placeholder.height()) {
               if (prevHeight !== 0) {
                  _stableHandler();
               }
               return;
            }
            prevHeight = _$placeholder.height();
            setTimeout(bookHeightCheck, BOOK_HEIGHT_CHECK_INTERVAL);
         }, BOOK_HEIGHT_CHECK_INTERVAL);
      }
   }

   ////////// HELPERS ///////////
   /**
    *
    * @param {Document} document
    * @param {Object} styles
    */
   function _injectStyles(document, styles) {
      var head = document.head;
      _.each(styles, function(cssText, styleId) {
         var styleEl = head.querySelector('style[data-id="' + styleId + '"]');
         if (null === styleEl) {
            styleEl = document.createElement('style');
            styleEl.type = 'text/css';
            styleEl.setAttribute('data-id', styleId);
            head.appendChild(styleEl);
         }
         styleEl.innerHTML = cssText;
      });
   }

   function patchSelector(cssText) {
      return cssText.replace(/((?:^|,)\s*)(body)?/g, function() {
         return arguments[1] + '#' + CONTAINER_ID + (arguments[2] ? '' : ' ');
      });
   }

   function _safeCaller(obj, method) {
      var func = _.get(obj, method),
          args = Array.prototype.slice.call(arguments, 2);
      func = _.isFunction(func) ? func : _.noop;
      return func.apply(obj, args);
   }
});
