define([
   'module',
   'underscore',
   'jquery',
   'publication/locator',
   'publication/highlighter',
   'publication/dom-utils/marker-utils',
   'swLoggerFactory'
], function(module, _, $, Locator, Highlighter, MarkerUtils, swLoggerFactory) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   /* jshint -W016 */
   /* jshint browser:true */

   var FIRST_PARA_CLASS_NAME  = 'paragraph-first',
       LAST_PARA_CLASS_NAME   = 'paragraph-last';

   // virtual scroll
   function VirtualScroll(view, contentProvider, scroll) {
      var $element   = view.getContainerElement(),
          $viewport  = _wrapElement($element);

      /* ---- api ---- */

      this.destroy               = destroy;
      this.updateContentHeight   = updateContentHeight;

      this.setScroll    = _setScroll;

      this.alignViewportByLocator   = alignViewportByLocator;
      //  TODO remove below below functions from api
      this.alignViewportById        = alignViewportById;
      this.alignViewportByElement   = alignViewportByElement;
      this.getScrollableElement     = _.constant($viewport);
      this.addPositionChangeHandler    = addPositionChangeHandler;
      this.removePositionChangeHandler = removePositionChangeHandler;

      /* === impl === */
      var MIN_SCREENS_COUNT   = 5;

      var callbacks        = [],
          maxOffset        = 0,
          viewportHeight   = 0,
          pixelsToCover    = 0,
          extraHeight      = 0,
          wordsHeightRatio,
          firstBlockId     = null,
          lastBlockId      = null;

      var _onScroll     = _.debounce(_onScrollImmediately, 100),
          _getFirstId   = _.flow(_.first, _.property('id')),
          _getLastId    = _.flow(_.last, _.property('id')),
          _appendContentBlock    = _createInserter(view, false),
          _prependContentBlock   = _createInserter(view, true);

      _init();

      function _init() {
         updateContentHeight();
         scroll.addListener(_onScroll);
      }

      function destroy() {
         scroll.removeListener(_onScroll);
         _.invoke(_onScroll, 'cancel');
         callbacks.length = 0;
         _appendContentBlock  = null;
         _prependContentBlock = null;
         _onScroll = null;
      }

      function _onScrollImmediately() {
         if (!scroll.isActive() || !_onScroll) {
            return;
         }

         var offset = scroll.getScrollTop();
         _onChangeViewportOffset(offset);
         _.each(callbacks, _.method('call', null, {}));
      }

      function addPositionChangeHandler(cb) {
         callbacks.push(cb);
      }

      function removePositionChangeHandler(cb) {
         callbacks = _.without(callbacks, cb);
      }

      /**
       *
       * @param {?PublicationStartLocator|InTextLocator} locator
       * @param {boolean} reload
       */
      function alignViewportByLocator(locator, reload) {
         if (locator === null || locator instanceof Locator.PublicationStartLocator) {
            alignViewportById('', reload);
            scroll.setScrollTop(0);
            return;
         }

         var paragraphId = locator.prefixedParagraphId;
         var $targetBlock = alignViewportById(paragraphId, reload);
         if ($targetBlock === null) {
            return;
         }

         Highlighter.decorateAndAlign(locator, $element[0], alignViewportByElement);
      }

      function alignViewportByElement(alignElement) {
         if (!alignElement /*|| alignElement.classList.contains(FIRST_PARA_CLASS_NAME)*/) {
            return;
         }
         scroll.scrollIntoView(alignElement);
      }

      /**
       *
       * @param {string} id
       * @param {boolean} reload
       * @returns {?jQuery}
       */
      function alignViewportById(id, reload) {
         var $container = view.getContainerElement();

         var $targetBlock = id ? $container.find('#' + id) : id;
         if ((contentProvider && !$targetBlock.length) || reload) {
            $targetBlock = _reloadForTarget(id);
         }

         if ($targetBlock && $targetBlock.length) {
            alignViewportByElement($targetBlock[0]);
            return $targetBlock;
         }

         return null;
      }

      /**
       *
       * @param {string} id
       * @returns {?jQuery}
       * @private
       */
      function _reloadForTarget(id) {
         var contents = contentProvider.fetchInitialBlocks(id);
         if (_.isNull(contents)) {
            return null;
         }

         var $container = view.getContainerElement();

         // TODO: rewrite so that target block and its followers are appended first,
         // preceding elements are prepended than
         firstBlockId = _getFirstId(contents);
         lastBlockId  = _getLastId(contents);

         $container.empty();

         _.each(contents, function(contentBlock) {
            contentBlock.$html = $(contentBlock.html);
            _appendContentBlock(contentBlock);
         });

         id = id || firstBlockId;
         var $targetBlock = $container.find('#' + id);

         // $targetBlock = $targetBlock.length ? $targetBlock : _firstLoadedBlock();
         if ($targetBlock.length === 0) {
            return null;
         }

         var scrollHandlingAlreadyPrevented = scroll._preventScrollHandling;
         if (!scrollHandlingAlreadyPrevented) {
            scroll.preventScrollHandling();
         }
         _loadNextPageIfNeeded($targetBlock);
         scroll.scrollIntoView($targetBlock);
         _loadPrevPageIfNeeded($targetBlock);
         if (!scrollHandlingAlreadyPrevented) {
            scroll.resumeScrollHandling();
         }

         _onLoadMore();

         return $targetBlock;
      }

      function _onLoadMore() {
         var count      = _detectId(lastBlockId) - _detectId(firstBlockId),
             contents   = contentProvider.fetchAfter(firstBlockId, count),
             materials  = _.reduce(contents, _materialsReducer, {});

         view.finalizeLoading(materials);
         _recalcMaxOffset();
      }

      function updateContentHeight() {
         viewportHeight = scroll.clientHeight();
         pixelsToCover = (MIN_SCREENS_COUNT + 1 >>> 1) * viewportHeight;
         _recalcMaxOffset();
      }

      function _recalcMaxOffset() {
         var sh = $element.height(); // scroll.getScrollHeight() - broken because of timing issues
         maxOffset   = Math.round(sh - viewportHeight);
         extraHeight = Math.round(sh - $element.children('div:last').height());

         // TODO: consider making the check the first action of the method
         _updateWordsHeightRatio();
      }

      function _updateWordsHeightRatio() {
         var loadedParagraphs = _getLoadedParagraphs();
         if (loadedParagraphs.length === 0) {
            wordsHeightRatio = undefined;
            return;
         }

         var firstLoadedPara  = loadedParagraphs[0];
         var lastLoadedPara   = loadedParagraphs[loadedParagraphs.length - 1];
         var loadedWordsCount = +lastLoadedPara.getAttribute('data-words-count') +
            (lastLoadedPara.getAttribute('data-before') - firstLoadedPara.getAttribute('data-before'));
         var loadedContentHeight = __calcBlocksHeight(firstLoadedPara, lastLoadedPara);

         wordsHeightRatio = loadedWordsCount / loadedContentHeight;
      }

      function _onChangeViewportOffset(offset) {
         var delta = viewportHeight >> 1,
             isSelectionIntact = $('.selection-border').is(':visible'),
             atLastBorder  = false,
             atFirstBorder = false;

         offset = Math.max(offset, 0);

         if (offset <= delta) {
            atFirstBorder = true;
            _loadPrevPage();
         }

         if (offset >= (maxOffset - delta)) {
            atLastBorder = true;
            _loadNextPage();
         }

         if (atLastBorder || atFirstBorder) {
            _recalcMaxOffset();

            if (!isSelectionIntact) {

               if (atFirstBorder) {
                  _cuttingLastPageIfNeeded();
               }
               else if (atLastBorder) {
                  _cuttingFirstPageIfNeeded();
               }
            }

            _onLoadMore();
         }

         // FIX: https://irls.isd.dp.ua/redmine/issues/1412
         // for more information see: https://github.com/cubiq/iscroll/issues/178
         $viewport.find('textarea:focus').toggleClass('force-redraw');
      }

      function _loadNextPageIfNeeded($targetBlock) {
         var $lastBlock = _lastLoadedBlock();

         if ($lastBlock.is('.' + LAST_PARA_CLASS_NAME)) {
            return;
         }

         if (_calcBlocksHeight($targetBlock, _lastLoadedBlock()) < (pixelsToCover + viewportHeight)) {
            _loadNextPage();
         }
      }

      function _loadNextPage() {
         var contents      = [],
             fetchedContents = null,
             fetchedWordsCount = 0,
             fetchSize = 1,
             fetchedWordsLimit = 0,
             pixelsAdded   = 0,
             $firstAdded   = null,
             $lastBlock    = _lastLoadedBlock();

         function _adjustFetchLimits() {
            fetchedWordsLimit = wordsHeightRatio * pixelsToCover || 0;
            fetchSize = fetchedWordsLimit ? 1 : 7;
         }

         function _processContentBlock(fetchedContentBlock) {
            fetchedContentBlock.$html = $(fetchedContentBlock.html);
            fetchedWordsCount += +fetchedContentBlock.$html[0].getAttribute('data-words-count');
         }

         _adjustFetchLimits();
         do {
            contents = [];
            do {
               fetchedContents = contentProvider.fetchAfter(lastBlockId, fetchSize);
               if (!fetchedContents) {
                  break;
               }
               fetchedContents.forEach(_processContentBlock);
               lastBlockId = fetchedContents[fetchedContents.length - 1].id;
               Array.prototype.push.apply(contents, fetchedContents);
            } while (fetchedWordsCount < fetchedWordsLimit);

            if (contents.length === 0) {
               break;
            }

            _.each(contents, _appendContentBlock);
            $firstAdded = $firstAdded || _nextBlock($lastBlock);
            pixelsAdded = _calcBlocksHeight($firstAdded, _lastLoadedBlock());
            if (!fetchedWordsLimit && pixelsAdded > viewportHeight) {
               _updateWordsHeightRatio();
               _adjustFetchLimits();
            }
         } while (_shouldCoverMore(pixelsAdded));
      }

      function _loadPrevPageIfNeeded($targetBlock) {
         if ($targetBlock.is('.' + FIRST_PARA_CLASS_NAME)) {
            return;
         }

         if (_shouldCoverMore(_calcBlocksHeight(_firstLoadedBlock(), $targetBlock))) {
            _loadPrevPage();
         }
      }

      function _loadPrevPage() {
         var contents      = [],
             fetchedContents = null,
             fetchedContentBlock = null,
             fetchedWordsCount = 0,
             fetchedWordsLimit = wordsHeightRatio * pixelsToCover,
             scrollTop     = scroll.getScrollTop(),
             pixelsAdded   = 0,
             $firstAdded   = null,
             $firstBlock   = _firstLoadedBlock();

         do {
            contents = [];
            do {
               fetchedContents = contentProvider.fetchBefore(firstBlockId, 1);
               if (!fetchedContents) {
                  break;
               }
               fetchedContentBlock = fetchedContents[0];
               fetchedContentBlock.$html = $(fetchedContentBlock.html);
               contents.unshift(fetchedContentBlock);
               firstBlockId = fetchedContentBlock.id;
               fetchedWordsCount += +fetchedContentBlock.$html[0].getAttribute('data-words-count');
            } while (fetchedWordsCount < fetchedWordsLimit);

            if (contents.length === 0) {
               break;
            }

            _.eachRight(contents, _prependContentBlock);
            $firstAdded = $firstAdded || _previousBlock($firstBlock);
            pixelsAdded = _calcBlocksHeight(_firstLoadedBlock(), $firstAdded);
            if (pixelsAdded > 0) {
               scroll.setScrollTop(Math.floor(pixelsAdded + scrollTop));
            }
         } while (_shouldCoverMore(pixelsAdded));
      }

      function _cuttingLastPageIfNeeded() {
         var offset           = scroll.getScrollTop(),
             needToRemove     = maxOffset - offset - pixelsToCover - extraHeight;

         if (needToRemove <= (pixelsToCover >> 1)) {
            return;
         }

         var $lastBlock       = _lastBlock(_lastLoadedBlock()),
             $newLastBlock    = null,
             pixelsToRemove   = 0;

         do {
            $newLastBlock = $newLastBlock ? _previousBlock($newLastBlock) : $lastBlock;
            if ( !$newLastBlock ) {
               break;
            }
            pixelsToRemove = _calcBlocksHeight($newLastBlock, $lastBlock);
         } while (pixelsToRemove < needToRemove);

         $newLastBlock.nextAll().remove();
         lastBlockId = $newLastBlock[0].id;
      }

      function _cuttingFirstPageIfNeeded() {
         var offset           = scroll.getScrollTop(),
             needToRemove     = offset - pixelsToCover - extraHeight;

         if (needToRemove <= (pixelsToCover >> 1)) {
            return;
         }

         var $firstBlock      = _firstBlock(_firstLoadedBlock()),
             $newFirstBlock   = null,
             pixelsToRemove   = 0;

         do {
            $newFirstBlock = $newFirstBlock ? _nextBlock($newFirstBlock) : $firstBlock;
            if ( !$newFirstBlock) {
               break;
            }
            pixelsToRemove = _calcBlocksHeight($firstBlock, $newFirstBlock);
         } while (pixelsToRemove < needToRemove);

         pixelsToRemove -= _calcBlocksHeight($newFirstBlock, $newFirstBlock);

         $newFirstBlock.prevAll().remove();
         firstBlockId = $newFirstBlock[0].id;

         if (pixelsToRemove > 0) {
            scroll.setScrollTop(Math.floor(scroll.getScrollTop() - pixelsToRemove));
         }
      }

      function _loadedBlocks() {
         return view.getContainerElement().children();
      }

      function _getLoadedParagraphs() {
         return MarkerUtils.getParagraphElements( view.getContainerElement()[0] );
      }

      function _firstLoadedBlock() {
         return _loadedBlocks().first();
      }

      function _lastLoadedBlock() {
         return _loadedBlocks().not('aside').last();
      }

      function _setScroll(_scroll) {
         scroll.removeListener(_onScroll);
         _.invoke(_onScroll, 'cancel');
         scroll = _scroll;
         _init();
      }

      function _shouldCoverMore(addedPixels) {
         return addedPixels < pixelsToCover - (viewportHeight >> 1);
      }
   }

   return VirtualScroll;


   function _wrapElement($element) {
      var $wrapper = $('<div></div>');
      $element.wrapInner($wrapper);
      return $element.children();
   }

   function _prepareContentBlock(contentBlock) {
      var $contentBlock = contentBlock.$html;
      Highlighter.wrapWords($contentBlock[0]);
      $contentBlock.find('a').attr(MarkerUtils.getMetaMarker(), function() {
         return this.getAttribute('epub:type') === 'noteref' ? '' : null;
      });
      return $contentBlock;
   }

   function _calcBlocksHeight($top, $bottom) {
      return __calcBlocksHeight($top[0], $bottom[0]);
   }

   function __calcBlocksHeight(top, bottom) {
      return bottom.getBoundingClientRect().bottom - top.getBoundingClientRect().top;
   }

   function _createInserter(view, atStart) {
      return function _insertContentBlock(contentBlock) {
         var $container = view.getContainerElement();
         var $block = _prepareContentBlock(contentBlock);

         if (contentBlock.first) {
            $block.addClass(FIRST_PARA_CLASS_NAME);
         }
         if (contentBlock.last) {
            $block.addClass(LAST_PARA_CLASS_NAME);
         }
         $container[atStart ? 'prepend' : 'append']($block);

         // _.each($block, Highlighter.decorateWords);

         if (contentBlock.materials) {
            view.decorateBlockWithPlugins(contentBlock.materials, $block.first());
         }
      };
   }

   function _previousBlock($block) {
      var $elem = $block.prevAll('[data-before]').first();

      if ( $elem && $elem.length ) {
         return $elem;
      }

      logger.error('Couldn\'t find previous element');
      return null;
   }

   function _nextBlock($block) {
      var $elem = $block.nextAll('[data-before]').first();
      if ( $elem && $elem.length ) {
         return $elem;
      }

      logger.error('Couldn\'t find next element');
      return null;
   }

   function _firstBlock($block) {
      return $block.is('[data-before]') ? $block : _nextBlock($block);
   }

   function _lastBlock($block) {
      return $block.is('[data-before]') ? $block : _previousBlock($block);
   }

   function _detectId(para) {
      return +_.last(para.split('_'));
   }

   function _materialsReducer(memo, block) {
      if ( !block.materials ) {
         return memo;
      }

      return _.reduce(block.materials, _materialsJoiner, memo);
   }

   function _materialsJoiner(memo, list, type) {
      if (_.contains(['annotations', 'comments'], type)) {
         list = _.cloneDeep(list);
      }
      memo[type] = _.union([], memo[type], list);
      return memo;
   }
});
