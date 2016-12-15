define(['publication/locator'], function(Locator) {
   'use strict';

   /* globals window */

   var META_MARKER = 'data-meta';

   var MarkerUtils = {

      /**
       *
       * @param {Element} paragraphContainer
       * @returns {Array.<Element>}
       */
      getParagraphElements: function getParagraphElements(paragraphContainer) {
         var paragraphsNodeList = paragraphContainer.querySelectorAll(MarkerUtils.getContentElementSelector());
         return Array.prototype.slice.call(paragraphsNodeList);
      },

      /**
       *
       * @param {Element} paragraph
       * @returns {?Element}
       */
      getNextParagraph: function getNextParagraph(paragraph) {
         return _getParagraphByDirection(paragraph, false);
      },

      /**
       *
       * @param {Element} paragraph
       * @returns {?Element}
       */
      getPreviousParagraph: function getPreviousParagraph(paragraph) {
         return _getParagraphByDirection(paragraph, true);
      },

      /**
       *
       * @param {Element} paragraphContainer
       * @returns {Element}
       */
      getFirstLoadedParagraph: function getFirstLoadedParagraph(paragraphContainer) {
         return paragraphContainer.querySelector(MarkerUtils.getContentElementSelector());
      },

      getLastLoadedParagraph: function getLastLoadedParagraph(paragraphContainer) {
         var paragraphElements = paragraphContainer.querySelectorAll(MarkerUtils.getContentElementSelector());
         return paragraphElements[paragraphElements.length - 1];
      },

      /**
       *
       * @param {Element} startParagraph
       * @param {Element} endParagraph
       */
      getParagraphElementsInRange: function getParagraphElementsInRange(startParagraph, endParagraph) {
         var paragraphElements = [];
         var currentElement = startParagraph;
         // assertion block
         while (currentElement !== endParagraph) {
            if (this.isContent(currentElement)) {
               paragraphElements.push(currentElement);
            }
            currentElement = currentElement.nextElementSibling;
            if (currentElement === null) {
               throw new Error('Failed to collect paragraphs in range:' +
                  ' startParagraph [' + startParagraph.id + '],' +
                  ' endParagraph [' + endParagraph.id + ']');
            }
         }
         paragraphElements.push(endParagraph);
         return paragraphElements;
      },

      /**
       *
       * @param {Element} element
       * @returns {Array.<Element>}
       */
      getMetaElements: function getMetaElements(element) {
         var metaElementsNodeList = element.querySelectorAll(MarkerUtils.getMetaElementSelector());
         return Array.prototype.slice.call(metaElementsNodeList);
      },

      /**
       *
       * @param {Element} element
       * @returns {boolean}
       */
      isContent: function isContent(element) {
         return _is(element, MarkerUtils.getContentElementSelector());
      },

      /**
       *
       * @param {Element} element
       * @returns {boolean}
       */
      isFirstParagraph: function isFirstParagraph(element) {
         return _is(element, MarkerUtils.getFirstParagraphSelector());
      },

      /**
       *
       * @param {Element} element
       */
      isLastParagraph: function isFirstParagraph(element) {
         return _is(element, MarkerUtils.getLastParagraphSelector());
      },

      /**
       *
       * @param {Element} element
       * @returns {boolean}
       */
      isMeta: function isMeta(element) {
         return _is(element, MarkerUtils.getMetaElementSelector());
      },

      /**
       *
       * @returns {string}
       */
      getContentElementSelector: function getContentElementSelector() {
         return '[data-before]';
      },

      /**
       * @returns {string}
       */
      getFirstParagraphSelector: function getFirstParagraphSelector() {
         return '.paragraph-first';
      },

      /**
       * @returns {string}
       */
      getLastParagraphSelector: function getLastParagraphSelector() {
         return '.paragraph-last';
      },

      /**
       *
       * @returns {string}
       */
      getPublicationHeaderSelector: function getPublicationHeaderSelector() {
         return '.book-info-box';
      },

      /**
       *
       * @param {Element} [publicationContainer]
       * @returns {Element}
       */
      getPublicationHeaderElement: function getPublicationHeaderElement(publicationContainer) {
         publicationContainer = publicationContainer || window.document.documentElement;
         var publicationHeaderElement = publicationContainer.querySelector(this.getPublicationHeaderSelector());
         return publicationHeaderElement;
      },

      /**
       *
       * @returns {string}
       */
      getMetaElementSelector: function getMetaElementSelector() {
         return '[' + META_MARKER + ']';
      },

      /**
       *
       * @returns {string}
       */
      getMetaMarker: function getMetaMarker() {
         return META_MARKER;
      },

      /**
       *
       * @param {Element} paragraphElement
       * @returns {string}
       */
      getParagraphId: function getParagraphId(paragraphElement) {
         return paragraphElement.id.slice('para_'.length);
      },

      /**
       *
       * @param {string} id
       * @param {Element} [paragraphContainer]
       * @returns {?Element}
       */
      getParagraphById: function getParagraphById(id, paragraphContainer) {
         if (paragraphContainer === undefined) {
            paragraphContainer = window.document.documentElement;
         }
         if (id.indexOf('para_') === 0) {
            throw new Error('Attempt to use prefixed id ' + id);
         }
         return paragraphContainer.querySelector('#para_' + id);
      },

      /**
       *
       * @param {ParagraphLocator|PublicationStartLocator} locator
       * @param {Element} [elementContainer]
       * @returns {?Element}
       */
      getElementByLocator: function getElementByLocator(locator, elementContainer) {
         if (locator instanceof Locator.ParagraphLocator) {
            return this.getParagraphById(locator.paragraphId, elementContainer);
         }
         else if (locator instanceof Locator.PublicationStartLocator) {
            return this.getPublicationHeaderElement();
         }
         throw new Error('Cannot fetch element by non-paragraph locator: [' + locator.toJSON() + ']');
      }
   };

   /**
    *
    * @param {Element} element
    * @param {string} selector
    * @returns {boolean}
    * @private
    */
   var _is = function(element, selector) {
      _is = 'matches' in element ?
         function(element, selector) { return element.matches(selector); } :
         function(element, selector) { return element.msMatchesSelector(selector); };
      return _is(element, selector);
   };

   /**
    * @param {Element} paragraph
    * @param {boolean} isDesc
    * @returns {?Element}
    */
   function _getParagraphByDirection(paragraph, isDesc) {
      var currentElement = paragraph,
            _sibling       = isDesc ? 'previousElementSibling' : 'nextElementSibling';

      /* jshint -W084 */
      while (currentElement = currentElement[_sibling]) {
         if (MarkerUtils.isContent(currentElement)) {
            break;
         }
      }
      /* jshint +W084 */
      return currentElement;
   }


   return MarkerUtils;
});