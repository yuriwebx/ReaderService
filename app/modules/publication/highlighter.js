define([
   /*'underscore',*/
   /*'publication/tools/locator-tools',*/
   'publication/dom-utils/text-utils',
   'publication/dom-utils/marker-utils',
   /*'publication/locator'*/
], function(/*_, LocatorTools, */ TextUtils, MarkerUtils/*, Locator*/) {
   'use strict';

   var Highlighter = {
      /**
       * Example function.
       *
       * @param {Element} element
       */
      decorateSentences: function(element) {
         var preparedText = TextUtils.extractContent(element);
         var sentencesRealOffsets = TextUtils.locateSentencesInText(preparedText);
         var sentencesStableOffsets = TextUtils.turnIntoStableOffsets(sentencesRealOffsets, preparedText);
         var domLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks(sentencesStableOffsets, element);

         // for demo purposes
         var decoratorClassNames = [
            "nota-annotation-cat-48-69-67-68-6c-69-67-68-74",
            "nota-annotation-cat-52-65-6d-65-6d-62-65-72",
         ];
         var decoratorClassIndex = 0;
         domLocatorBlocks.reverse().forEach(function(domLocatorBlock) {
            _decorateSection(domLocatorBlock, decoratorClassNames[decoratorClassIndex = 1 - decoratorClassIndex]);
         });
      },

      /**
       *
       * @param {Element} element
       */
      wrapWords: function wrapWords(element) {
         if (element.hasAttribute('data-ww')) {
            // TODO: check for rewraps?
            return;
         }

         var preparedText = TextUtils.extractContent(element);
         var wordsStableOffsets = TextUtils.collectWordsStableOffsets(preparedText);
         var domLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks(wordsStableOffsets, element);

         var wordIndex = domLocatorBlocks.length;
         while (wordIndex--) {
            _decorateSection(domLocatorBlocks[wordIndex], '', { wi: wordIndex });
         }
         element.setAttribute('data-ww', '');

         //// TODO: simplify, move into TextUtils
         //var textNodeIterator = element.ownerDocument.createNodeIterator(element,
         //   4, // NodeFilter.SHOW_TEXT
         //   function() { return 1; }, // using all the nodes, hurrah!
         //   null
         //);
         //
         //var whitespaceNodes = [];
         //wordIndex = null;
         //var textNode;
         ///* jshint -W084 */
         //while (textNode = textNodeIterator.nextNode()) {
         //   if (textNode.parentNode.hasAttribute('data-wi')) {
         //      wordIndex = textNode.parentNode.getAttribute('data-wi');
         //   }
         //   else if (wordIndex !== null) {
         //      whitespaceNodes.push({
         //         textNode: textNode,
         //         wi: wordIndex
         //      });
         //   }
         //}
         ///* jshint +W084 */
         //whitespaceNodes.forEach(function(wsNode) {
         //   _decorateTextNode(wsNode.textNode, '', { wi: wsNode.wi, ws: '' });
         //});
      },

      /**
       *
       * @param {Array.<string>} words
       * @param {Element} element
       * @param {string} decoratorClassName
       * @param {Object} [decoratorData]
       */
      // decorateSearchWords: function decorateSearchWords(words, element, decoratorClassName, decoratorData) {
      //    var preparedText = TextUtils.extractContent(element);
      //    var searchTermsRealOffsets = TextUtils.locateSearchTermsInText(words, preparedText);
      //    var searchTermsStableOffsets = TextUtils.turnIntoStableOffsets(searchTermsRealOffsets, preparedText);
      //    var domLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks(searchTermsStableOffsets, element);

      //    domLocatorBlocks.reverse().forEach(function(section) {
      //       _decorateSection(section, decoratorClassName, decoratorData);
      //    });
      // },

      /**
       *
       * @param {InTextRangeLocator} locator
       * @param {string} decoratorClassName
       * @param {Object} [decoratorData]
       */
      decorateReadingPosition: function decorateReadingPosition(locator, decoratorClassName, decoratorData) {
         var paragraphId = locator.startLocator.paragraphId;

         var paragraphElement = MarkerUtils.getParagraphById(paragraphId);
         if (!paragraphElement) {
            return;
         }

         var stableOffsets = [locator.startLocator.logicalCharOffset, locator.endLocator.logicalCharOffset];
         var domLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks([stableOffsets], paragraphElement);
         _decorateSections(domLocatorBlocks, decoratorClassName, decoratorData);
      },

      /**
       *
       * @param {InTextLocator} locator
       * @param {Element} container
       * @param {string} decoratorClassName
       * @param {Object} [decoratorData]
       * @returns {Array.<Element>}
       */
      decorateInTextLocator: function decorateInTextLocator(locator, container, decoratorClassName, decoratorData) {
         var paragraphElement = MarkerUtils.getParagraphById(locator.paragraphId, container);
         var domLocatorBlock = TextUtils.convertIntoDomLocatorBlock(
            [locator.logicalCharOffset, locator.logicalCharOffset + 1], paragraphElement);
         var decorators = _decorateSection(domLocatorBlock, decoratorClassName, decoratorData);
         return decorators;
      },

      /**
       *
       * @param {PublicationStartLocator|InTextLocator} locator
       * @param {Element} container
       * @param {Function} alignerFunction
       */
      decorateAndAlign: function decorateAndAlign(locator, container, alignerFunction) {
         var tempClass = '___';
         var readingPositionDecorators = Highlighter.decorateInTextLocator(locator, container, tempClass);
         alignerFunction(readingPositionDecorators[0]);
         readingPositionDecorators.forEach(_removeDecorator);
      },

      /**
       *
       * @param {InTextRangeLocator} inTextRangeLocator
       * @param {Element} container
       * @param {string} className
       */
      decorateInTextRangeLocator: function decorateInTextRangeLocator(inTextRangeLocator, container, className) {
         var startParagraphId = inTextRangeLocator.startLocator.paragraphId;
         var startParagraph = MarkerUtils.getParagraphById(startParagraphId, container);

         var endParagraphId = inTextRangeLocator.endLocator.paragraphId;
         var endParagraph = MarkerUtils.getParagraphById(endParagraphId, container);

         var decoratedParagraphs = MarkerUtils.getParagraphElementsInRange(startParagraph, endParagraph);
         decoratedParagraphs.forEach(function(para) {
            var start = para === startParagraph ? inTextRangeLocator.startLocator.logicalCharOffset : 0;
            var end = para === endParagraph ? inTextRangeLocator.endLocator.logicalCharOffset : Infinity;
            var domLocatorBlock = TextUtils.convertIntoDomLocatorBlock([start, end], para);
            _decorateSection(domLocatorBlock, className);
         });
      },

      /**
       *
       * @param {string} className
       * @param {Element} container
       */
      undecorateByClass: function undecorateByClass(className, container) {
         // TODO: extract into MarkerUtils
         var elements = Array.prototype.slice.call(container.querySelectorAll('.' + className));
         elements.forEach(function(element) {
            _removeDecorator(element);
         });
      },

      /**
       *
       * @param {string} oldClass
       * @param {string} newClass
       * @param {Element} container
       */
      redecorateByClass: function redecorateByClass(oldClass, newClass, container) {
         // TODO: extract into MarkerUtils
         var elements = Array.prototype.slice.call(container.querySelectorAll('.' + oldClass));
         elements.forEach(function(element) {
            element.classList.remove(oldClass);
            element.classList.add(newClass);
         });
      },

      decorateStableOffsets : function decorateStableOffsets(stableOffsets, element, decoratorClassName, decoratorData) {
        var domLocatorBlocks = TextUtils.convertIntoDomLocatorBlocks(stableOffsets, element);

        domLocatorBlocks.reverse().forEach(function(section) {
           _decorateSection(section, decoratorClassName, decoratorData);
        });
      }
      //
      //decorateParagraphByLocator: function decorateParagraphByLocator(locator, paragraphElement, decoratorClassName, decoratorData) {
      //   var section = LocatorTools.collectSectionByLocator(locator, paragraphElement);
      //   _decorateSection(section, decoratorClassName, decoratorData);
      //},
      //
      //locatePoint: function locatePoint(point, visibleParagraphs) {
      //   return LocatorTools.locatePointInParagraphs(point, visibleParagraphs);
      //}
   };

   return Highlighter;

   /**
    *
    * @param {Array.<DomLocatorBlock>} domLocatorBlocks
    * @param {string} [decoratorClassName]
    * @param {Object} [decoratorData]
    * @returns {Array.<Element>}
    * @private
    */
   function _decorateSections(domLocatorBlocks, decoratorClassName, decoratorData) {
      var i = domLocatorBlocks.length;
      var sectionsDecorators = [];
      while (i--) {
         Array.prototype.unshift.apply(sectionsDecorators,
            _decorateSection(domLocatorBlocks[i], decoratorClassName, decoratorData));
      }
      return sectionsDecorators;
   }

   /**
    *
    * @param {DomLocatorBlock} domLocatorBlock
    * @param {string} [decoratorClassName]
    * @param {Object} [decoratorData]
    * @returns {Array.<Element>}
    * @private
    */
   function _decorateSection(domLocatorBlock, decoratorClassName, decoratorData) {
      var sectionDecorators = domLocatorBlock.map(function(domLocator) {
         return _decorateDomLocator(domLocator, decoratorClassName, decoratorData);
      });
      return sectionDecorators;
   }

   ///**
   // *
   // * @param {Node} textNode
   // * @param {string} [decoratorClassName]
   // * @param {Object} [decoratorData]
   // * @returns {HTMLElement}
   // * @private
   // */
   //function _decorateTextNode(textNode, decoratorClassName, decoratorData) {
   //   // assert textNode.nodeType === 3
   //   /** @type {DomLocator} */
   //   var domLocator = {
   //      textNode: textNode,
   //      start: 0,
   //      end: textNode.data.length
   //   };
   //   return _decorateDomLocator(domLocator, decoratorClassName, decoratorData);
   //}

   /**
    *
    * @param {DomLocator} domLocator
    * @param {string} [decoratorClassName]
    * @param {Object} [decoratorData]
    * @returns {Element}
    * @private
    */
   function _decorateDomLocator(domLocator, decoratorClassName, decoratorData) {
      var textNode      = domLocator.textNode;
      var start         = domLocator.start;
      var end           = domLocator.end;
      var decoratorElement = _createDecorator(textNode, decoratorClassName, decoratorData);
      var decorableTextNode = textNode;
      var textNodeLength = textNode.data.length;
      if (start !== 0) {
         decorableTextNode = textNode.splitText(start);
      }
      if (end !== textNodeLength) {
         decorableTextNode.splitText(end - start);
      }
      decorableTextNode.parentNode.insertBefore(decoratorElement, decorableTextNode);
      decoratorElement.appendChild(decorableTextNode);
      return decoratorElement;
   }

   /**
    *
    * @param {Node} decoratedNode
    * @param {string} [decoratorClassName]
    * @param {Object} [decoratorData]
    * @returns {Element}
    * @private
    */
   function _createDecorator(decoratedNode, decoratorClassName, decoratorData) {
      var decoratorElement = decoratedNode.ownerDocument.createElement('span');
      if (decoratorClassName && typeof decoratorClassName === 'string') {
         decoratorElement.className = decoratorClassName;
      }
      if (decoratorData && typeof decoratorData === 'object') {
         Object.keys(decoratorData).forEach(function(key) {
            decoratorElement.setAttribute('data-' + key, decoratorData[key]);
         });
      }
      return decoratorElement;
   }

   /**
    *
    * @param {Element} decoratorElement
    * @private
    */
   function _removeDecorator(decoratorElement) {
      var parentNode = decoratorElement.parentNode;
      var childNodes = Array.prototype.slice.call(decoratorElement.childNodes);
      var documentFragment = decoratorElement.ownerDocument.createDocumentFragment();
      childNodes.forEach(function(node) {
         documentFragment.appendChild(node);
      });
      parentNode.replaceChild(documentFragment, decoratorElement);
      parentNode.normalize(); // TODO: test in IE
   }
   /*function getNextTextNode(element, prevNode) {
    var node, goInside;
    if (prevNode === null) {
    prevNode = element;
    goInside = true;
    }
    else {
    goInside = false;
    }

    do {
    node = goInside ? prevNode.firstChild : prevNode.nextSibling;
    if (node === null) {
    if (!goInside) {
    prevNode = prevNode.parentNode;
    }
    goInside = false;
    }
    else if (node.nodeType === 3) {
    break;
    }
    else {
    goInside = node.nodeType === 1;
    prevNode = node;
    }
    }
    while (prevNode !== element);

    return node;
    }*/
});