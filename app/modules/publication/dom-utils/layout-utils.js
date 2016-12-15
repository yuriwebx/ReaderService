define(['publication/locator', 'utils/search', './text-utils', './marker-utils'], function(Locator, search, TextUtils, MarkerUtils) {
   'use strict';

   /** globals console */

   /**
    * @typedef {Object} LogicalPosition
    * @property {Element} element
    * @property {StableCharacterOffset} stableCharOffset
    */

   /**
    * @typedef {?(number|Array.<number>)} StableCharacterOffset
    *
    * Index of stable (non-whitespace) character in element that goes _after_ the point.
    * It's an array, if the point is inside a word (sequence of non-whitespace characters).
    * It's a number, if the point is outside a word.
    * It's null, if any of the following is true:
    *    - the point is after the last word of the target element
    *    - the target element is empty (has no content)
    *    - the point is below the last element in the search collection
    */

   /**
    * @constructor
    * @param {Node} node
    * @param {number} offset
    */
   function Position(node, offset) {
      this.textNode = node;
      this.realOffset = offset;

      this.parentElement = this.textNode.parentNode;
      this.isTextBased = node.nodeType === 3;
   }

   /**
    * @typedef {Object} LogicalPositionFinderOptions
    * @property {boolean} forceLayoutUsage
    * @property {boolean} forceLinearElementSearch
    */

   return {
      /**
       *
       * @param {number} x
       * @param {number} y
       * @param {Array.<Element>} elements
       * @param {Element} container
       * @param {LogicalPositionFinderOptions} [finderOptions]
       * @returns {LogicalPosition}
       */
      findLogicalPositionByPoint: function findLogicalPositionByPoint(
         x, y, elements, container, finderOptions)
      {
         if (elements.length === 0) { // assertion
            throw new Error('Empty elements list');
         }

         finderOptions = finderOptions || {};
         var forceLayoutUsage = finderOptions.forceLayoutUsage || false;
         var forceLinearElementSearch = finderOptions.forceLinearElementSearch || false;


         var doc = container.ownerDocument;
         var position = _getPositionFromPoint(x, y, doc);
         if (forceLayoutUsage  ||  position !== null && !container.contains(position.parentElement)) {
            position = null;
         }

         // _positionComparator is not used here as it tends to be pulled to the bottom element even if in between two
         var elementSearchResult = search(elements, y, _layoutComparator, {
            forceLinear: forceLinearElementSearch
         });
         var stableOffset = null;
         var elementByPoint;

         if (elementSearchResult.found) {
            elementByPoint = elements[ elementSearchResult.index ];
            if (MarkerUtils.isContent(elementByPoint)) {
               stableOffset = _findStableOffsetByPoint(elementByPoint, position, x, y);
               if (stableOffset === null) { // EOL
                  if (elements.length - 1 !== elementSearchResult.index) {
                     elementByPoint = elements[ elementSearchResult.index + 1 ];
                     stableOffset = 0;
                  }
               }
            }
            else { // TODO: get locator of non-content element
               Object.create(null);
            }
         }
         else {
            if (elements.length === elementSearchResult.index[1]) {
               elementByPoint = elements[ elementSearchResult.index[0] ];
               stableOffset = null;
            }
            else {
               elementByPoint = elements[ elementSearchResult.index[1] ];
               if (MarkerUtils.isFirstParagraph(elementByPoint)) {
                  elementByPoint = null;
               }
               stableOffset = 0;
            }
         }

         if (stableOffset === null) {
            stableOffset = TextUtils.calculateContentStableLength(elementByPoint);
         }

         return {
            element: elementByPoint,
            stableCharOffset: stableOffset
         };
      },

      /**
       *
       * @param {LogicalPosition} logicalPosition
       * @param {Array.<Element>} elements
       * @returns {Locator.InTextRangeLocator}
       * @private
       */
      convertPositionToRangeLocator: function convertPositionToRangeLocator(logicalPosition, elements) {
         var element = logicalPosition.element;
         if (element === null) { // publication start case
            element = elements[0];
         }
         var stableOffset = logicalPosition.stableCharOffset;
         if (!Array.isArray(stableOffset)) {
            stableOffset = [stableOffset, stableOffset];
         }

         var paragraphId = MarkerUtils.getParagraphId(element);

         return new Locator.InTextRangeLocator(
            new Locator.InTextLocator(paragraphId, stableOffset[0]),
            new Locator.InTextLocator(paragraphId, stableOffset[1])
         );
      },

      /**
       *
       * @param {LogicalPosition} logicalPosition
       * @param {boolean} useStart
       * @returns {Locator.PublicationStartLocator|Locator.InTextLocator}
       */
      convertPositionToScalarLocator: function convertPositionToScalarLocator(logicalPosition, useStart) {
         var element = logicalPosition.element;
         if (element === null) {
            return new Locator.PublicationStartLocator();
         }

         var stableOffset = logicalPosition.stableCharOffset;
         if (Array.isArray(stableOffset)) {
            stableOffset = stableOffset[1 - useStart];
         }

         var paragraphId = MarkerUtils.getParagraphId(element);
         return new Locator.InTextLocator(paragraphId, stableOffset);
      },

      /**
       *
       * @param {InTextLocator|PublicationStartLocator} locator
       * @param {Element} container
       * @returns {?ClientRect}
       */
      calcLocatorRectangle: function calcLocatorRectangle(locator, container, isWordEnding) {
         var element = MarkerUtils.getElementByLocator(locator);
         if (element === null) {
            return null;
         }

         if (locator instanceof Locator.PublicationStartLocator) {
            return element.getBoundingClientRect();
         }

         var wordOffsets;
         if (isWordEnding) {
            wordOffsets = [locator.logicalCharOffset - 1, locator.logicalCharOffset];
         }
         else {
            wordOffsets = [locator.logicalCharOffset, locator.logicalCharOffset + 1];
         }

         var domLocatorBlock = TextUtils.convertIntoDomLocatorBlock(wordOffsets, element);
         // assert Array.isArray(domLocatorBlock) && domLocatorBlock.length === 1
         if (domLocatorBlock.length === 0) {
            return null;
         }
         var domLocator = domLocatorBlock[0];
         var range = container.ownerDocument.createRange();
         var textNode = domLocator.textNode;
         range.setStart(textNode, domLocator.start);
         range.setEnd(textNode, domLocator.end);
         var rangeRectangle = range.getBoundingClientRect();
         return rangeRectangle;
      },

      /**
       *
       * @param {PublicationLocator} locator
       * @param {Element} [container]
       */
      getPreviousLocator: function getPreviousLocator(locator, container) {
         if (locator instanceof Locator.PublicationStartLocator) {
            return locator;
         }

         var paraId;
         var el = MarkerUtils.getElementByLocator(locator, container);

         if (locator.logicalCharOffset === 0) {
            var _para = MarkerUtils.getPreviousParagraph(el);

            if (el === null) {
               return new Locator.PublicationStartLocator();
            }

            paraId = MarkerUtils.getParagraphId(_para);

            return new Locator.InTextLocator(paraId, TextUtils.calculateContentStableLength(_para));
         }

         var prevCharOffset = TextUtils.getPreviousStableOffset(locator.logicalCharOffset, el);

         if (prevCharOffset === null) {
            throw new Error('Couldn\'t find previous stableCharOffset.');
         }

         paraId = MarkerUtils.getParagraphId(el);

         return new Locator.InTextLocator(paraId, prevCharOffset);
      },

      /**
       *
       * @param {PublicationLocator} locator
       * @param {Element} [container]
       */
      getNextLocator: function getNextLocator(locator, container) {
         if (locator instanceof Locator.PublicationEndLocator) {
            return locator;
         }
         var paraId;
         var el = MarkerUtils.getElementByLocator(locator, container);

         var nextCharOffset = TextUtils.getNextStableOffset(locator.logicalCharOffset, el);

         if (nextCharOffset === null) {
            var _para = MarkerUtils.getNextParagraph(el);
            if (_para === null) {
               throw new Error('Couldn\'t find next paragraph.');
               // return new Locator.PublicationEndLocator();
            }

            paraId = MarkerUtils.getParagraphId(_para);

            return new Locator.InTextLocator(paraId, 0);
         }

         paraId = MarkerUtils.getParagraphId(el);

         return new Locator.InTextLocator(paraId, nextCharOffset);
      }

   };

   /**
    *
    * @param {Element} contentElement
    * @param {?Position} position
    * @param {number} x
    * @param {number} y
    * @returns {StableCharacterOffset}
    * @private
    */
   function _findStableOffsetByPoint(contentElement, position, x, y) {
      var realOffset = null;
      var textContent = TextUtils.extractContent(contentElement);
      var wordsStableOffsets = TextUtils.collectWordsStableOffsets(textContent);
      var wordsDomLocatorBlocks, wordSearchResult;

      if (wordsStableOffsets.length !== 0) {
         wordsDomLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks(wordsStableOffsets, contentElement);
         wordSearchResult = position === null ?
            _findWordByLayout(x, y, wordsDomLocatorBlocks) :
            _findWordByPosition(position, wordsDomLocatorBlocks);

         if (wordSearchResult.found) {
            realOffset = wordsStableOffsets[ wordSearchResult.index ].slice(0);
         }
         else if (wordSearchResult.index[1] !== wordsStableOffsets.length) {
            realOffset = wordsStableOffsets[ wordSearchResult.index[1] ][0];
         }
      }
      // TODO: warn about suspicious DOM structure in `else` branch
      return realOffset;
   }

   /**
    *
    * @param {Position} position
    * @param {Array.<DomLocatorBlock>} wordsDomLocatorBlocks
    * @returns {SearchResult} positionSearchResult
    * @private
    */
   function _findWordByPosition(position, wordsDomLocatorBlocks) {
      var positionSearchResult = search(wordsDomLocatorBlocks, position, _wordPositionComparator);
      return positionSearchResult;
   }

   /**
    * @param {DomLocatorBlock} wordChunks
    * @param {Position} position
    * @returns {(-1|0|1)}
    */
   function _wordPositionComparator(wordChunks, position) {
      var wordDirection;
      wordChunks.every(
         /**
          * @param {DomLocator} wordChunk
          * @returns {boolean}
          * @private
          */
         function _wordChunkPositionComparator(wordChunk) {
            var wordChunkDirection = _domLocatorPositionComparator(wordChunk, position);
            if (wordChunkDirection === 0) {
               wordDirection = 0;
               return false;
            }
            if (wordChunkDirection === 1) {
               wordDirection = wordDirection === -1 ? 0 : 1;
               return false;
            }
            wordDirection = wordChunkDirection;
            return true;
         }
      );
      return wordDirection;
   }

   /**
    *
    * @param {DomLocator} domLocator
    * @param {Position} position
    * @returns {(-1|0|1)}
    * @private
    */
   function _domLocatorPositionComparator(domLocator, position) {
      var positionComparison = _positionComparator(domLocator.textNode, position.textNode);
      if (positionComparison !== 0) {
         return positionComparison;
      }

      if (position.realOffset >= domLocator.end) {
         return -1;
      }
      if (position.realOffset < domLocator.start) {
         return 1;
      }
      return 0;
   }

   /**
    *
    * @param {Node} comparedElement
    * @param {Node} baseElement
    * @returns {(-1|0|1)}
    * @private
    */
   function _positionComparator(comparedElement, baseElement) {
      if (comparedElement === baseElement) {
         return 0;
      }
      var documentPositionComparison = baseElement.compareDocumentPosition(comparedElement);

      /* jshint -W016 */
      if (documentPositionComparison & 8) { // DOCUMENT_POSITION_CONTAINS
         return 0;
      }
      else if (documentPositionComparison & 2) { // DOCUMENT_POSITION_PRECEDING
         return -1;
      }
      else if (documentPositionComparison & 4) { // DOCUMENT_POSITION_FOLLOWING
         return 1;
      }
      /* jshint +W016 */
      else {
         throw new Error('Position comparison mismatch: ' +
            'node A (' + comparedElement['outerHTML' in comparedElement ? 'outerHTML' : 'data'] +
            '), node B (' + baseElement['outerHTML' in baseElement ? 'outerHTML' : 'data'] + ')');
      }
   }

   /**
    * @typedef {Object} Distance
    * @property {number} x
    * @property {number} y
    */

   /**
    *
    * @param {number} x
    * @param {number} y
    * @param {Array.<DomLocatorBlock>} wordsDomLocatorBlocks
    * @returns {SearchResult} layoutSearchResult
    * @private
    */
   function _findWordByLayout(x, y, wordsDomLocatorBlocks) {
      /** @type ?{SearchResult} */
      var layoutSearchResult = {
         found: false,
         index: undefined
      };

      var indexOfSideSwitch, deltaX, firstDeltaX, lastDeltaX, firstSameRowIndex, lastCheckedIndex;
      wordsDomLocatorBlocks.every(function(domLocatorBlock, i) {
         var wordDistance = _detectDomLocatorBlockToPointDistance(domLocatorBlock, x, y);
         if (wordDistance === null) {
            throw new Error('Impossible error: word block should never be empty');
         }

         if (wordDistance.y > 0) { // stepped on the next line, stop looking
            return false;
         }

         lastCheckedIndex = i; // intentionally allowing above-words to follow same-row-words to deal with dropcap
         deltaX = wordDistance.x;
         if (wordDistance.y === 0) {
            if (deltaX === 0) {
               layoutSearchResult.found = true;
               layoutSearchResult.index = i;
               return false;
            }

            if (lastDeltaX === undefined) {
               firstSameRowIndex = i;
               firstDeltaX = lastDeltaX = deltaX;
               return true;
            }

            if (lastDeltaX < 0 && deltaX > 0 || lastDeltaX > 0 && deltaX < 0) {
               if (indexOfSideSwitch === undefined) {
                  // side switch: might be a second one in the bidirectional text
                  indexOfSideSwitch = i;
               }
               else {
                  // there already have been a side switch, this one is final
                  indexOfSideSwitch = i;
                  return false;
               }
            }
            lastDeltaX = deltaX;
         }
         return true;
      });

      if (!layoutSearchResult.found) {
         if (indexOfSideSwitch !== undefined) { // there are words in the same row as point, at least two around it
            layoutSearchResult.index = [indexOfSideSwitch - 1, indexOfSideSwitch];
         }
         else if (firstSameRowIndex !== undefined) { // there are words in the same row, all at the same side of point
            //noinspection JSUnusedAssignment
            layoutSearchResult.index =
               ( Math.abs(firstDeltaX) > Math.abs(lastDeltaX) ) || // more than one word, judging on the smallest distance
               (firstSameRowIndex === lastCheckedIndex && firstDeltaX < 0) ? // one word in the row, treating as LTR
                  [lastCheckedIndex, lastCheckedIndex + 1] :
                  [firstSameRowIndex - 1, firstSameRowIndex];
         }
         else { // no words in the same row as point (somehow)
            layoutSearchResult.index = lastCheckedIndex === undefined ?
               [-1, 0] : // no words above the point
               [lastCheckedIndex, lastCheckedIndex + 1];
         }
      }

      return layoutSearchResult;
   }

   /**
    *
    * @param {DomLocatorBlock} word
    * @param {number} clientX
    * @param {number} clientY
    * @returns {?Distance}
    * @private
    */
   function _detectDomLocatorBlockToPointDistance(word, clientX, clientY) {
      // assert word.length !== 0
      /** @type {?{Distance} */
      var wordDistance = null;
      var wordClientRects = Array.prototype.concat.apply([], word.map(
         /**
          *
          * @param {DomLocator} wordChunk
          * @returns {Array.<ClientRect>}
          * @private
          */
         function _chunkToRects(wordChunk) {
            var textNode = wordChunk.textNode;
            var range = textNode.ownerDocument.createRange();
            range.setStart(textNode, wordChunk.start);
            range.setEnd(textNode, wordChunk.end);
            var rectsAsArray = Array.prototype.slice.call(range.getClientRects());
            if (rectsAsArray.length === 0) {
               throw new Error('domLocator [' + wordChunk.textNode.data + '] with offsets ' +
                  wordChunk.start + ':' + wordChunk.end + ' ended up being invisible');
            }
            return rectsAsArray;
         }
      ));

      wordClientRects.every(
         /**
          *
          * @param {ClientRect} clientRect
          * @returns {boolean}
          * @private
          */
         function _wordClientRectToPointDistance(clientRect) {
            // mind the dropcap
            var clientRectDistance = _detectRectToPointDistance(clientRect, clientX, clientY);
            if (clientRectDistance === null) {
               // TODO: warn (but can be valid, too)
               return true;
            }

            var inSameLine = false;

            if (wordDistance === null) {
               wordDistance = clientRectDistance;
            }

            if (clientRectDistance.y === 0) {
               // direct hit check
               if (clientRectDistance.x === 0) {
                  wordDistance = clientRectDistance;
                  return false;
               }

               if (wordDistance.y === 0) {
                  inSameLine = true;
               }
            }
            else if (clientRectDistance.y > 0) {
               // if word chunk is above the point, the whole word is considered above the point
               // UNLESS one of chunks is directly hit
               wordDistance.y = (wordDistance.y > 0 ? Math.min : Math.max)
                  (clientRectDistance.y, wordDistance.y);
            }
            else {
               // if word chunk is below the point, it overrides the chunk placed in the same line
               // to deal with dropcap words
               wordDistance.y = (wordDistance.y === 0 ? Math.min : Math.max)
                  (clientRectDistance.y, wordDistance.y);
            }

            if (wordDistance.x < 0 && clientRectDistance.x < 0) {
               wordDistance.x = Math.max(wordDistance.x, clientRectDistance.x);
            }
            else if (wordDistance.x > 0 && clientRectDistance.x > 0) {
               wordDistance.x = Math.min(wordDistance.x, clientRectDistance.x);
            }
            else {
               wordDistance.x = 0;
               return !inSameLine;
            }
            return true;
         }
      );
      return wordDistance;
   }

   /**
    *
    * @param {ClientRect} rect
    * @param {number} clientX
    * @param {number} clientY
    * @returns {?Distance}
    * @private
    */
   function _detectRectToPointDistance(rect, clientX, clientY) {
      var distance = {
         x: 0,
         y: 0
      };
      if (_isHeightlessRectangle(rect)) {
         return null;
      }
      if (rect.bottom < clientY) {
         distance.y = rect.bottom - clientY;
      }
      else if (rect.top > clientY) {
         distance.y = rect.top - clientY;
      }
      if (rect.right < clientX) {
         distance.x = rect.right - clientX;
      }
      else if (rect.left > clientX) {
         distance.x = rect.left - clientX;
      }
      return distance;
   }

   /**
    *
    * @param {Element} comparedElement
    * @param {number} clientY
    * @returns {(-1|0|1)}
    * @private
    */
   function _layoutComparator(comparedElement, clientY) {
      var rect = comparedElement.getBoundingClientRect();
      if (rect.bottom === rect.top) {
         // TODO: consider the footnotes
         // the hidden ones should be decorated with an attribute and filtered out early
         throw new Error('Attempt to use zero-height element (' + comparedElement.outerHTML + ') in point lookup');
      }
      if (rect.bottom < clientY) {
         return -1;
      }
      if (rect.top > clientY) {
         return 1;
      }
      return 0;
   }

   /**
    *
    * @param {ClientRect} rect
    * @returns {boolean}
    * @private
    */
   function _isHeightlessRectangle(rect) {
      return rect.height === 0;
   }

   /**
    *
    * @param {number} x
    * @param {number} y
    * @param {Document} doc
    * @returns {?Position}
    */
   function _getPositionFromPoint(x, y, doc) {
      var range;
      var position = null;
      // TODO: one-time choice of detector
      if ('caretPositionFromPoint' in doc) {
         range = doc.caretPositionFromPoint(x, y);
         if (range !== null) {
            position = new Position(range.offsetNode, range.offset);
         }
      }
      else if ('caretRangeFromPoint' in doc) {
         range = doc.caretRangeFromPoint(x, y);
         if (range !== null) {
            position = new Position(range.startContainer, range.startOffset);
         }
      }

      if (position && !position.isTextBased) {
         position = null;
      }

      return position;
   }
});