define(['underscore',
        'xregexp',
        'unidecode',
        './marker-utils'],
        function(_,
                 xRegExp,
                 unidecode,
                 MarkerUtils) {
   "use strict";

   /**
    * @typedef {Object} PatternCollectorOptions
    * @property {RegExp} nonBoundaryPattern
    * @property {Function} concatConditionChecker
    */

   /**
    * @typedef {Array.<number>} CharacterOffsets
    */

   /**
    * @typedef {Object} DomLocator
    * @property {Text} textNode
    * @property {number} start
    * @property {number} end
    */

   /**
    * @typedef {Array.<DomLocator>} DomLocatorBlock
    */

   var TextUtils = {
      /**
       *
       * @param {Element} element
       * @returns {string}
       */
      extractContent: function extractContent(element) {
         /*if (!MarkerUtils.isContent(element)) {
            throw new Error('Attempt to extract content from a meta element ' +
            '(' + element.outerHTML + ')');
         }*/
         var clonedElement = element.cloneNode(true);

         var metaElements = MarkerUtils.getMetaElements(clonedElement);
         metaElements.forEach(function(el) {
            var metaElementReplacementText = clonedElement.ownerDocument.createTextNode(' ');
            el.parentNode.replaceChild(metaElementReplacementText, el);
         });

         var newlineElements = clonedElement.querySelectorAll('br, hr');
         [].forEach.call(newlineElements, function(el) {
            var newlineTextNode = clonedElement.ownerDocument.createTextNode('\n');
            el.parentNode.replaceChild(newlineTextNode, el);
         });
         return clonedElement.textContent;
      },

      /**
       * @deprecated
       * @param {Element} element
       * @returns {string}
       */
      extractContentForLegacyHighlighter: function extractContentForLegacyHighlighter(element) {
         var textNodeIterator = element.ownerDocument.createNodeIterator(element,
            4, // NodeFilter.SHOW_TEXT
            function(textNode) {
               return _isArtificialTextNode(textNode) || MarkerUtils.isMeta(textNode.parentNode) ? 2 : 1;
            },
            null
         );
         var textNode, textContent = '';
         /* jshint -W084 */
         while (textNode = textNodeIterator.nextNode()) {
            textContent += textNode.data;
         }
         /* jshint +W084 */
         return textContent;
      },

      /**
       *
       * @param {Array.<string>} searchTerms
       * @param {string} text
       * @returns {Array.<CharacterOffsets>}
       */
      locateSearchTermsInText: function locateSearchTermsInText(searchTerms, text) {
         // assert Array.isArray(searchTerms) && searchTerms.length !== 0
         var searchTermsPattern = _getSearchTermsPattern(searchTerms);

         var nonBoundaryPattern = xRegExp('[' + _getNonBoundaryChars() + ']');

         return _collectRealOffsetsByPattern(searchTermsPattern, text, {
            nonBoundaryPattern: nonBoundaryPattern
         });
      },

      /**
       *
       * @param {string} text
       * @returns {Array.<CharacterOffsets>}
       */
      locateSentencesInText: function locateSentencesInText(text) {
         var sentenceDelimiters = '….!?';
         var sentenceDelimitingPattern = '[' + sentenceDelimiters + ']+';
         var sentenceContentsPattern = '[^' + sentenceDelimiters + ']+';
         var sentencePattern = xRegExp(sentenceContentsPattern + '(?:' + sentenceDelimitingPattern + '|$)', 'g');

         var tailAbbreviationsPattern = new RegExp(
            '(?:[^a-z]|^)(?=[a-z]+' + sentenceDelimitingPattern +
               '$)[^aeoiu]+' + sentenceDelimitingPattern + '$', 'i');

         var concatConditionChecker = function(str) {
            // basically, any 'sentence candidate' that ends on with series of consonants is rejected
            // this helps to avoid Mr., Mrs. and all the other abbreviation' cases
            // (but obviously can give false positives)
            return tailAbbreviationsPattern.test(unidecode(str));
         };
         return _collectRealOffsetsByPattern(sentencePattern, text, {
            concatConditionChecker: concatConditionChecker
         });
      },

      /**
       * Single offset transformer
       *
       * @param {number} realOffset
       * @param {string} text
       * @returns {number}
       */
      turnIntoStableOffset: function turnIntoStableOffset(realOffset, text) {
         var arrayResult = this.turnIntoStableOffsets([realOffset], text);
         return arrayResult[0];
      },

      /**
       *
       * @param {Array.<CharacterOffsets|number>} realOffsets
       * @param {string} text
       * @returns {Array.<CharacterOffsets|number>} stableOffsets
       */
      turnIntoStableOffsets: function turnIntoStableOffsets(realOffsets, text) {
         var accumulatedWhitespace = 0;
         var previousRealOffset = 0;
         var whitespaceCharacterPattern = _getWhitespaceCharacterPattern();

         function _dehydrateRealOffset(realOffset) {
            var whitespaceBeforeOffset = text.slice(previousRealOffset, realOffset)
               .match(whitespaceCharacterPattern);

            if (whitespaceBeforeOffset) {
               accumulatedWhitespace += whitespaceBeforeOffset.length;
            }
            previousRealOffset = realOffset;
            return realOffset - accumulatedWhitespace;
         }

         var stableOffsets = realOffsets.map(function(realOffset) {
            return Array.isArray(realOffset) ? realOffset.map(_dehydrateRealOffset) : _dehydrateRealOffset(realOffset);
         });
         return stableOffsets;
      },

      /**
       * Single offset recoverer
       *
       * @param {number} stableOffset
       * @param {string} text
       * @param {boolean} [isWordEnding=false]
       * @returns {number} realOffset
       */
      recoverRealOffset: function recoverRealOffset(stableOffset, text, isWordEnding) {
         var arrayResult = this.recoverRealOffsets([stableOffset], text, isWordEnding);
         return arrayResult[0];
      },

      /**
       *
       * @param {Array.<CharacterOffsets|number>} stableOffsets
       * @param {string} text
       * @param {boolean} [isWordEnding=false]
       * @returns {Array.<CharacterOffsets|number>} realOffsets
       */
      recoverRealOffsets: function recoverRealOffsets(stableOffsets, text, isWordEnding) {
         isWordEnding = isWordEnding || false;
         var realOffsets = [];

         var i = 0;

         var stableCharactersPattern = _getStableCharactersPattern();
         var accumulatedStableCharacters = 0;

         var realOffset = null;
         var arrayedStableOffsets = stableOffsets.map(function(offset) {
            if (Array.isArray(offset)) {
               if (offset.length > 2) {
                  throw new Error('Illegal parameter: neither a single offset nor word boundaries');
               }
            }
            else {
               offset = [offset];
            }
            return offset;
         });

         var match, lastIndex, charDiff, charsInMatch, isOffsetPair;
         /* jshint -W084 */
         while (match = stableCharactersPattern.exec(text)) {
            charsInMatch = match[0].length;
            accumulatedStableCharacters += charsInMatch;
            lastIndex = stableCharactersPattern.lastIndex;

            while (i < arrayedStableOffsets.length && accumulatedStableCharacters >= arrayedStableOffsets[i][0]) {
               isOffsetPair = arrayedStableOffsets[i].length === 2;

               if (accumulatedStableCharacters === arrayedStableOffsets[i][0]) {
                  if (isOffsetPair || !isWordEnding) {
                     break;
                  }
                  realOffset = lastIndex;
               }

               if (realOffset === null) {
                  charDiff = accumulatedStableCharacters - arrayedStableOffsets[i][0];
                  realOffset = lastIndex - charDiff;
               }

               if (isOffsetPair) {
                  charDiff = accumulatedStableCharacters - arrayedStableOffsets[i][1];
                  if (charDiff < 0) {
                     break;
                  }
                  realOffset = [realOffset, lastIndex - charDiff];
               }

               realOffsets.push(realOffset);
               realOffset = null;
               i++;
            }

            if (i === arrayedStableOffsets.length) {
               break;
            }
         }
         /* jshint +W084 */

         // assert stableOffsets.length === realOffsets.length
         return realOffsets;
      },

      /**
       * A shortcut function (as stable offsets can be collected immediately)
       *
       * @param {string} textContent
       * @returns {Array.<CharacterOffsets>}
       */
      collectWordsStableOffsets: function collectWordsStableOffsets(textContent) {
         var wordsStableOffsets = [];
         var stableCharactersPattern = _getStableCharactersPattern();
         var previousPositionEnd = 0;

         var match;
         /* jshint -W084 */
         while (match = stableCharactersPattern.exec(textContent)) {
            wordsStableOffsets.push([previousPositionEnd, previousPositionEnd += match[0].length]);
         }
         /* jshint +W084 */
         return wordsStableOffsets;
      },

      /**
       *
       * @param {Element} element
       * @returns {number}
       */
      calculateContentStableLength: function calculateContentStableLength(element) {
         var textContent = this.extractContent(element);
         var stableCharactersPattern = _getStableCharactersPattern();
         var stableLength = 0;

         var match;
         /* jshint -W084 */
         while (match = stableCharactersPattern.exec(textContent)) {
            stableLength += match[0].length;
         }
         /* jshint +W084 */
         return stableLength;
      },

      /**
       *
       * @param {number} realOffset
       * @param {string} text
       * @returns {?number}
       */
      findMatchingBoundaryOffset: function findMatchingBoundaryOffset(realOffset, text) {
         var stableCharactersPattern = _getStableCharactersPattern();
         stableCharactersPattern.lastIndex = realOffset;
         var stableCharactersSequence = stableCharactersPattern.exec(text);
         return stableCharactersSequence && stableCharactersPattern.lastIndex;
      },

      /**
       *
       * @param {number} realOffset
       * @param {string} text
       * @returns {?number}
       */
      findNextWordOffset: function findNextWordOffset(realOffset, text) {
         var stableCharactersPattern    = _getStableCharactersPattern();
         var whitespaceCharacterPattern = _getWhitespaceCharacterPattern();
         var mixedPattern = new RegExp(whitespaceCharacterPattern.source + '(' + stableCharactersPattern.source + ')', 'g');
         mixedPattern.lastIndex = realOffset;
         var mixedCharactersMatch = mixedPattern.exec(text);
         return mixedCharactersMatch && mixedPattern.lastIndex - mixedCharactersMatch[1].length;
      },


      isArtificialTextNode: _isArtificialTextNode,


      /**
       *
       * @param {Array} wordOffsets
       * @param {Element} element
       * @returns {DomLocatorBlock}
       */
      convertIntoDomLocatorBlock: function convertIntoDomLocatorBlock(wordOffsets, element) {
         var arrayResult = this.convertIntoDomLocatorBlocks([wordOffsets], element);
         return arrayResult[0];
      },

     /**
      *
      * @param {Array.<CharacterOffsets>} stableOffsets
      * @param {Element} element
      * @returns {Array.<DomLocatorBlock>}
      */
      convertIntoDomLocatorBlocks: function convertIntoDomLocatorBlocks(stableOffsets, element) {
         // assert stableOffsets array is: not empty, sorted top-to-bottom, without overlapping ranges
         var textNodeIterator = element.ownerDocument.createNodeIterator(element,
            4, // NodeFilter.SHOW_TEXT
            function(textNode) {
               return _isArtificialTextNode(textNode) || MarkerUtils.isMeta(textNode.parentNode) ? 2 : 1;
            },
            null
         );

         var stableCharsPattern = _getStableCharactersPattern();
         var stableCharsTotal = 0;
         var recheckTextNode = false;
         var textNode;

         var domLocatorBlocks = stableOffsets.map(
           /**
            *
            * @param {CharacterOffsets} stableOffsets
            * @returns {DomLocatorBlock}
            * @private
            */
            function _convertStableOffsetsIntoDomLocatorBlock(stableOffsets) {
               var domLocatorBlock = [];
               var stableStart = stableOffsets[0];
               var stableEnd = stableOffsets[1];
               // assert !(stableStart >= stableEnd)
               var domLocator, stableCharsSequence;

               while (true) {
                  if (!recheckTextNode) {
                     textNode = textNodeIterator.nextNode();
                     stableCharsPattern.lastIndex = 0;
                     if (textNode === null) {
                        break;
                     }
                  }
                  recheckTextNode = false;

                  if (domLocator) {
                     domLocator = {
                        textNode: textNode,
                        start: 0
                     };
                  }

                  /* jshint -W084 */
                  while (stableCharsSequence = stableCharsPattern.exec(textNode.data)) {
                     stableCharsTotal += stableCharsSequence[0].length;
                     if (!domLocator) {
                        if (stableStart < stableCharsTotal) {
                           domLocator = {
                              textNode: textNode,
                              start: stableCharsPattern.lastIndex - stableCharsTotal + stableStart
                           };
                        }
                     }

                     if (domLocator) {
                        if (stableEnd <= stableCharsTotal) {
                           domLocator.end = stableCharsPattern.lastIndex - stableCharsTotal + stableEnd;
                           break;
                        }
                     }
                  }
                  /* jshint +W084 */

                  if (domLocator) {
                    if (domLocator.start === domLocator.end) {
                       break;
                    }
                    domLocatorBlock.push(domLocator);
                    if (domLocator.end) {
                       recheckTextNode = stableCharsPattern.lastIndex < textNode.data.length;
                       break;
                    }
                    domLocator.end = textNode.data.length;
                  }
               }
               return domLocatorBlock;
            }
         );
         return domLocatorBlocks;
      },
      searchQuoteRealOffsets: function(preparedText, quote) {
         if (quote.length === 0) {
            return [];
         }
         var quotesRe = _.map(quote, function(quoteWords) {
            return _getSearchTermsPattern(quoteWords);
         });
         var quoteMatch;
         var realOffsets = [];
         var realOffset = [];

         var lastPosition = 0;
         var quotesReIndex = 0;
         var cutText = preparedText;
         var stop = false;
         var nonBoundaryPattern = xRegExp('[' + _getNonBoundaryChars() + ']');
         var foundMatch;
         while (!stop) {
            for (var i = quotesReIndex; i < quotesRe.length; i++) {
               quoteMatch = _.first(_collectRealOffsetsByPattern(quotesRe[i], cutText, {
                  nonBoundaryPattern: nonBoundaryPattern
               }));
               foundMatch = Boolean(quoteMatch && quoteMatch.length);
               if (i === 0 && !foundMatch) {
                  //not found any match for first word in quote
                  stop = true;
                  break;
               }
               else if (!foundMatch || (!_validateSpaceBetweenWord(preparedText, lastPosition, lastPosition + quoteMatch[0]) && i !== 0)) {
                  //not found any match or (found word not in quote order or not first word) 
                  i = -1;
                  realOffset = [];
                  continue;
               }

               realOffset[0] = realOffset.length === 0 ? lastPosition + quoteMatch[0] : realOffset[0];
               lastPosition += quoteMatch[1];
               realOffset[1] = lastPosition;

               cutText = preparedText.substring(lastPosition);
            }

            if (realOffset.length !== 0) {
               realOffsets.push(realOffset);
            }
            realOffset = [];
         }
         return realOffsets;
      },
      createQuoteFromSentence : function preparedSentence(sentence) {
         var quote = sentence.match(xRegExp('[' + _getNonBoundaryChars() + ']+','g'));
         quote = _.map(quote, function(word) {
            return [word];
         });
         return quote;
      },
      /**
       * @param  {Array} realOffsets
       * @return {Array} normalizedRealOffsets
       */
      normalizingOverLoops: function normalizingOverLoops(realOffsets) {
        var sortedRealOffsets = _.sortBy(realOffsets, '0');
        var currentRealOffsets = sortedRealOffsets.shift();
        var normalizedRealOffsets = [];
        _.each(sortedRealOffsets, function(realOffset) {
          if (_inRange(realOffset, currentRealOffsets)) {
            currentRealOffsets[1] = realOffset[1] > currentRealOffsets[1] ? realOffset[1] : currentRealOffsets[1];
          }
          else {
            normalizedRealOffsets.push(currentRealOffsets);
            currentRealOffsets = realOffset;
          }
        });
        normalizedRealOffsets.push(currentRealOffsets);
        return normalizedRealOffsets;
      },
      /**
       * @param {number} stableOffset
       * @param {Element} element
       * @returns {?number}
       */
      getPreviousStableOffset: function getPreviousStableOffset(stableOffset, element) {
         if (stableOffset === 0) {
            return null;
         }

         var text = this.extractContent(element);
         var stableCharactersPattern = _getStableCharactersPattern();
         var accumulatedStableCharacters = 0;

         var match, charsInMatch;
         /* jshint -W084 */
         while (match = stableCharactersPattern.exec(text)) {
            charsInMatch = match[0].length;
            accumulatedStableCharacters += charsInMatch;

            if (accumulatedStableCharacters >= stableOffset) {
               return accumulatedStableCharacters - charsInMatch;
            }
         }
         /* jshint +W084 */
         return accumulatedStableCharacters;
      },

      getNextStableOffset: function getNextStableOffset(stableOffset, element) {
         var text = this.extractContent(element);
         var stableCharactersPattern = _getStableCharactersPattern();
         var accumulatedStableCharacters = 0;

         var match, charsInMatch;
         /* jshint -W084 */
         while (match = stableCharactersPattern.exec(text)) {
            charsInMatch = match[0].length;
            accumulatedStableCharacters += charsInMatch;

            if (accumulatedStableCharacters > stableOffset) {
               return accumulatedStableCharacters;
            }
         }
         /* jshint +W084 */
         return null;
      }

   };

   return TextUtils;

   /**
    *
    * @param {RegExp} pattern
    * @param {string} text
    * @param {PatternCollectorOptions} [options]
    * @returns {Array.<CharacterOffsets>} realOffsets
    * @private
    */
   function _collectRealOffsetsByPattern(pattern, text, options) {
      if (!pattern.global) {
         throw new Error('Pattern should be global');
      }
      var nonBoundaryPattern = options.nonBoundaryPattern;
      var concatConditionChecker = options.concatConditionChecker;

      var realOffsets = [];
      var match, start, end;

      /* jshint -W084 */
      while (match = pattern.exec(text)) {
         end = pattern.lastIndex;
         start = end - match[0].length;
         if (nonBoundaryPattern) {
            if (nonBoundaryPattern.test(text.charAt(end)) ||
               nonBoundaryPattern.test(text.charAt(start - 1))) {

               continue;
            }
         }

         // TODO: transform boundaries based on options
         realOffsets.push([start, end]);
      }
      /* jshint +W084 */

      // TODO: perform additional joining of indexes based on options (for Mrs. sentences case)
      if (concatConditionChecker) {
         realOffsets = _concatByCondition(realOffsets, concatConditionChecker, text);
      }

      return realOffsets;
   }

   /**
    *
    * @param {Array.<CharacterOffsets>} offsets
    * @param {Function} concatConditionChecker
    * @param {string} text
    * @returns {Array.<CharacterOffsets>}
    * @private
    */
   function _concatByCondition(offsets, concatConditionChecker, text) {
      var joinedOffsets = [];

      var i = 0;
      var joinStartOffset = 0;
      var str;

      /* jshint -W084 */
      var offset;
      while (offset = offsets[i]) {
         joinStartOffset = joinStartOffset || offset[0];
         str = text.slice(joinStartOffset, offset[1]);
         if (!concatConditionChecker(str)) {
            joinedOffsets.push([joinStartOffset, offset[1]]);
            joinStartOffset = 0;
         }
         i++;
      }
      /* jshint +W084 */

      if (joinStartOffset) {
         joinedOffsets.push([joinStartOffset, offsets[i - 1][1]]);
      }
      return joinedOffsets;
   }

   /**
    *
    * @returns {RegExp}
    * @private
    */
   function _getStableCharactersPattern() {
      return /\S+/g;
   }

   /**
    *
    * @returns {RegExp}
    * @private
    */
   function _getWhitespaceCharacterPattern() {
      return /\s/g;
   }

   /**
   *
   * @param {Node} textNode
   * @returns {boolean}
   * @private
   */
   function _isArtificialTextNode(textNode) {
      return /^(\n\s+)?$/.test(textNode.data);
   }

   function _inRange(element, range) {
     return element[0] >= range[0] && element[0] <= range[1];
   }

   function _validateSpaceBetweenWord(sentence, lastPosition, newPosition) {
      if (lastPosition === newPosition) {
         return true;
      }
      var spaceBetweenWord = sentence.substring(lastPosition, newPosition);

      var validateRe = xRegExp('^[^' + _getNonBoundaryChars() + ']+$');
      return validateRe.test(spaceBetweenWord);
   }

   function _getSearchTermsPattern(searchTerms) {
     var sortedWords = _.uniq(searchTerms);
     sortedWords.sort(function(a, b) {
        return b.length - a.length;
     });

     var allowedBeforeWord = '[\\p{Po}\\p{Ps}\\p{Pi}\\p{N}\\p{S}]*';
     var allowedAfterWord = '[\\p{Po}\\p{Pe}\\p{Pf}\\p{N}\\p{S}]*';
     var wordsAlternation = '(?:' + sortedWords.map(xRegExp.escape).join('|') + ')';
     var searchTermsPattern = xRegExp('(' + allowedBeforeWord + wordsAlternation + allowedAfterWord + ')', 'gi');

     return searchTermsPattern;
   }

   function _getNonBoundaryChars(){
    return '\\p{L}\\p{M}\\p{P}';
   }
});