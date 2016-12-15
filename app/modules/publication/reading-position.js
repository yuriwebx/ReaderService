define([
   'publication/dom-utils/layout-utils',
   'publication/dom-utils/marker-utils',
   'publication/dom-utils/text-utils',
   'publication/highlighter',
   'publication/locator'
], function(LayoutUtils, MarkerUtils, TextUtils, Highlighter, Locator) {
   "use strict";

   /* globals window */

   var CHARS_PER_WORD = 6; // drop when moving onto word-based locators

   var _contentContainer;
   var _scrollRectangleGetter;
   var _options;

   var _viewportRectangle;

   var _readingArea;
   var _readingPosition;
   var _readingPositionViewport;

   var _positionTrackers = null;

   var readingPositionApi = {
      /**
       *
       * @param {Function} scrollRectangleGetter
       * @param {Object} options
       */
      initialize: function initialize(scrollRectangleGetter, options) {
         // TODO: type check anyone?
         _scrollRectangleGetter = scrollRectangleGetter;

         _options = options || {};
         _options.shouldDetectReadingPosition = _options.shouldDetectReadingPosition || false;
         if (_options.shouldDetectReadingPosition) {
            _options.readCharsPerMinute = _options.readCharsPerMinute || {};
            _options.readCharsPerMinute.min = _options.readCharsPerMinute.min || CHARS_PER_WORD * 100;
            _options.readCharsPerMinute.max = _options.readCharsPerMinute.max || CHARS_PER_WORD * 300;

            _options.positionHighlightClass = _options.positionHighlightClass || {};
            _options.positionHighlightClass.min = _options.positionHighlightClass.min || '';
            _options.positionHighlightClass.max = _options.positionHighlightClass.max || '';

            _options.progressTracker = _options.progressTracker || function() {};
         }

         _contentContainer = null;
         _clearPositionTrackers();
      },

      /**
       *
       * @param {Element} contentContainer
       */
      setContentContainer: function setContentContainer(contentContainer) {
         _contentContainer = contentContainer;
         _readingArea = null;
         _readingPosition = null;
         _readingPositionViewport = null;
      },

      updateViewportRectangle: function updateViewportRectangle() {
         if (!_contentContainer) { // TODO: turn into an assertion
            return;
         }
         var contentRectangle = _contentContainer.getBoundingClientRect();
         var scrollableRectangle = _scrollRectangleGetter();

         _viewportRectangle = {
            left: contentRectangle.left,
            right: contentRectangle.right,
            top: scrollableRectangle.top,
            bottom: scrollableRectangle.bottom
         };
      },

      /**
       *
       * @returns {?Locator.RangeLocator}
       */
      updateReadingArea: function updateReadingArea() {
         var contentElements = MarkerUtils.getParagraphElements(_contentContainer);
         if (contentElements.length === 0) {
            return null;
         }
         this.updateViewportRectangle();
         var topReadingPosition = LayoutUtils.findLogicalPositionByPoint(
            _viewportRectangle.left + 61, _viewportRectangle.top + 1,
            contentElements, _contentContainer
         );

         var topmostElement = topReadingPosition.element;
         var restElements = topmostElement === null ?
            contentElements :
            contentElements.slice(contentElements.indexOf(topmostElement));
         var bottomReadingPosition = LayoutUtils.findLogicalPositionByPoint(
            _viewportRectangle.right - 7, _viewportRectangle.bottom - 15, restElements, _contentContainer,
            { forceLinearElementSearch: true }
         );

         var topLocator = LayoutUtils.convertPositionToScalarLocator(topReadingPosition, true);
         var bottomLocator = LayoutUtils.convertPositionToScalarLocator(bottomReadingPosition, false);
         if (bottomLocator.precedes(topLocator)) {
            // TODO: #3992 log the locators alongside viewport height
            bottomLocator = topLocator;
         }
         _readingArea = new Locator.RangeLocator(topLocator, bottomLocator);
         _readingPositionViewport = null;

         if (_options.shouldDetectReadingPosition) {
            if (_readingPosition === null) {
               _readingPosition = topLocator;
            }

            if (_positionTrackers === null) {
               _initPositionTrackers();
            }
            else {
               _schedulePositionTrackersAdvance();
            }
         }

         return _readingArea;
      },

      /**
       *
       * @returns {boolean}
       */
      scrolledTooFar: function scrolledTooFar() {
         return !(_positionTrackers === null ||
            this.isInsideReadingArea(_positionTrackers.max.position) ||
            this.isInsideReadingArea(_positionTrackers.min.position));
      },

      /**
       *
       * @returns {null|InTextLocator|PublicationStartLocator}
       */
      getReadingPosition: function getReadingPosition() {
         return _readingPosition;
      },

      /**
       *
       * @returns {null|InTextLocator|PublicationStartLocator}
       */
      getPessimisticReadingPosition: function getPessimisticReadingPosition() {
         return _getTrackedPosition('min');
      },

      /**
       *
       * @returns {null|InTextLocator|PublicationStartLocator}
       */
      getOptimisticReadingPosition: function getOptimisticReadingPosition() {
         return _getTrackedPosition('max');
      },

      /**
       *
       * @returns {Object} [_readingViewportPosition]
       */
      getReadingPositionViewport: function getReadingPositionViewport() {
         _readingPositionViewport = _readingPositionViewport || _calcReadingPositionViewport(_contentContainer);
         return _readingPositionViewport;
      },

      /**
       *
       * @param {PublicationStartLocator|InTextLocator} locator
       * @returns {boolean}
       */
      isPublicationEnd: function isPublicationEnd(locator) {
         // TODO: rewrite onto PublicationEndLocator usage
         if (locator instanceof Locator.PublicationStartLocator) {
            return false;
         }

         var paragraph = MarkerUtils.getElementByLocator(locator, _contentContainer);
         if (!MarkerUtils.isLastParagraph(paragraph)) {
            return false;
         }

         var paragraphContentLength = TextUtils.calculateContentStableLength(paragraph);
         return locator.logicalCharOffset === paragraphContentLength;
      },

      /**
       *
       * @param {InTextLocator} locator
       */
      resetReadingPosition: function resetReadingPosition(locator) {
         if (_options.shouldDetectReadingPosition) {
            _readingPosition = locator;
            _resetPositionTrackers();
         }
      },

      /**
       * This method is called to restore the persisted reading position.
       *
       * @param {Object} options
       * @param {PublicationStartLocator|InTextLocator} options.locator
       * @param {PublicationStartLocator|InTextLocator} [options.pessimisticReadingPosition]
       * @param {PublicationStartLocator|InTextLocator} [options.optimisticReadingPosition]
       */
      restoreReadingPosition: function restoreReadingPosition(options) {
         if (_options.shouldDetectReadingPosition) {
            _readingPosition = options.locator;
            if (options.optimisticReadingPosition && options.pessimisticReadingPosition) {
               if (_positionTrackers === null) {
                  _initPositionTrackers();
               }
               _positionTrackers.min.position = options.pessimisticReadingPosition;
               _positionTrackers.max.position = options.optimisticReadingPosition;
            }
         }
      },

      /**
       *
       * @param {Locator.InTextLocator} locator
       * @returns {boolean}
       */
      isInsideReadingArea: function isInsideReadingArea(locator) {
         if (_readingArea === null) {
            return false;
         }
         var isInside = !locator.precedes(_readingArea.startLocator) &&
            (locator.precedes(_readingArea.endLocator) ||
            locator instanceof Locator.PublicationStartLocator &&
            _readingArea.endLocator instanceof Locator.PublicationStartLocator);
         return isInside;
      }
   };

   return readingPositionApi;

   /**
    *
    * @private
    */
   function _resetPositionTrackers() {
      _clearPositionTrackers();
      _initPositionTrackers();
   }

   /**
    *
    * @private
    */
   function _clearPositionTrackers() {
      if (_positionTrackers !== null) {
         ['min', 'max'].forEach(_cancelPositionTrackerAdvance);
      }

      _positionTrackers = null;
   }

   /**
    *
    * @param {'min'|'max'} side
    * @private
    */
   function _cancelPositionTrackerAdvance(side) {
      if (_positionTrackers[side].scheduled !== null) {
         window.clearTimeout(_positionTrackers[side].scheduled);
      }
   }

   /**
    *
    * @private
    */
   function _initPositionTrackers() {
      if (_positionTrackers !== null) {
         throw new Error('Position trackers should be uninitialized');
      }
      if (_readingPosition === null) {
         throw new Error('Cannot initialize position trackers on empty reading position');
      }

      _positionTrackers = {};
      ['min', 'max'].forEach(_initPositionTracker);
   }

   /**
    *
    * @param {'min'|'max'} side
    * @private
    */
   function _initPositionTracker(side) {
      // assert !_positionTrackers.hasOwnProperty(side)
      _positionTrackers[side] = {
         scheduled: null,
         position: _readingPosition,
         element: null,
         contentStableLength: undefined
      };

      _schedulePositionTrackerAdvance(side);
   }

   /**
    *
    * @param {'min'|'max'} side
    * @returns {null|InTextLocator|PublicationStartLocator}
    * @private
    */
   function _getTrackedPosition(side) {
      return _positionTrackers && _positionTrackers[side].position;
   }

   /**
    *
    * @private
    */
   function _schedulePositionTrackersAdvance() {
      ['min', 'max'].forEach(_schedulePositionTrackerAdvance);
   }

   /**
    *
    * @param {'min'|'max'} side
    * @private
    */
   function _schedulePositionTrackerAdvance(side) {
      _cancelPositionTrackerAdvance(side);
      _positionTrackers[side].scheduled = window.setTimeout(function() {
         _advancePosition(side);
      },  60000 / _options.readCharsPerMinute[side]);

   }

   /**
    *
    * @param {'min'|'max'} side
    * @private
    */
   function _advancePosition(side) {
      if (_positionTrackers === null) { // destroyed
         return;
      }

      var _positionTracker = _positionTrackers[side];
      _positionTracker.scheduled = null;

      if (!_contentContainer.ownerDocument.body.contains(_contentContainer) ||
         _positionTracker.element && !_positionTracker.element.ownerDocument.body.contains(_positionTracker.element)) {
         // TODO: log the cases, it is an assertion actually
         _positionTracker.element = null;
         _positionTracker.contentStableLength = undefined;
         return;
      }

      var currentPosition = _positionTracker.position;
      if (!readingPositionApi.isInsideReadingArea(currentPosition)) {
         if (side === 'min') {
            _adjustMinPositionTracker();
         }
         return;
      }

      var currentElement, currentContentStableLength, targetElement, targetOffset;
      if (currentPosition instanceof Locator.PublicationStartLocator) {
         targetElement = MarkerUtils.getFirstLoadedParagraph(_contentContainer);
         targetOffset = 0;
      }
      else {
         currentElement = _positionTracker.element ||
            MarkerUtils.getParagraphById(currentPosition.paragraphId, _contentContainer);
         currentContentStableLength = _positionTracker.contentStableLength ||
            TextUtils.calculateContentStableLength(currentElement);
         targetOffset = currentPosition.logicalCharOffset + 1;

         if (targetOffset >= currentContentStableLength) { // `>` is a safety net, should never be used
            targetElement = MarkerUtils.getNextParagraph(currentElement);
            if (targetElement === null) { // EOF
               targetElement = currentElement;
            }
            else {
               targetOffset = 0;
            }
         }
         else {
            targetElement = currentElement;
         }
      }

      var targetParagraphId = MarkerUtils.getParagraphId(targetElement);
      var targetPosition = new Locator.InTextLocator(targetParagraphId, targetOffset);

      if (readingPositionApi.isInsideReadingArea(targetPosition)) {
         _readingPosition = _readingArea.startLocator;
         _positionTracker.position = targetPosition;
         if (_positionTracker.element === null || targetOffset === 0) {
            _positionTracker.element = targetElement;
            _positionTracker.contentStableLength = TextUtils.calculateContentStableLength(targetElement);
         }
         _finalizePositionTrackerChange(side);
      }
   }

   /**
    * TODO: implement
    * @private
    */
   function _adjustMinPositionTracker() {
      var minPositionTracker = _positionTrackers.min;
      var maxPositionTracker = _positionTrackers.max;
      if (!readingPositionApi.isInsideReadingArea(maxPositionTracker.position)) {
         return;
      }

      if (!minPositionTracker.position.precedes(maxPositionTracker.position)) {
         // TODO: assertion?
         return;
      }

      _options.progressTracker('jump', {
         from: minPositionTracker.position,
         to: _readingArea.startLocator
      });
      minPositionTracker.position = _readingArea.startLocator;
      minPositionTracker.element = MarkerUtils.getParagraphById(minPositionTracker.position.paragraphId, _contentContainer);
      minPositionTracker.contentStableLength = TextUtils.calculateContentStableLength(minPositionTracker.element);

      _finalizePositionTrackerChange('min');
   }

   /**
    *
    * @param {'min'|'max'} side
    * @private
    */
   function _finalizePositionTrackerChange(side) {
      var positionTracker = _positionTrackers[side];
      if (positionTracker.position === null) {
         throw new Error('Uninitialized position cannot be finalized');
      }

      if (positionTracker.position.logicalCharOffset === positionTracker.contentStableLength - 1) {
         _options.progressTracker(side, {
            paragraphLocator: positionTracker.position,
            wordsCount: positionTracker.element.getAttribute('data-words-count')
         });
      }

      if (_options.positionHighlightClass[side]) {
         Highlighter.undecorateByClass(_options.positionHighlightClass[side], _contentContainer);
         Highlighter.decorateInTextLocator(_positionTrackers[side].position, _contentContainer, _options.positionHighlightClass[side]);
      }
      _schedulePositionTrackerAdvance(side);
   }

   function _calcReadingPositionViewport(container) {
      if (!_readingArea) {
         return null;
      }

      var res = {};
      var endLocator = _readingArea.endLocator;

      res.start = LayoutUtils.calcLocatorRectangle(_readingArea.startLocator, container);

      if ( endLocator.logicalCharOffset === 0 ) {
         endLocator = LayoutUtils.getPreviousLocator(endLocator, container);
      }

      res.end = LayoutUtils.calcLocatorRectangle(endLocator, container, true);

      return res;
   }
});
