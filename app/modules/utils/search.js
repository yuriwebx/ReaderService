define([], function() {
   'use strict';

   /**
    * @typedef {Object} SearchOptions
    * @property {number=} lowestIndex
    * @property {number=} highestIndex
    * @property {boolean=} multiSearch
    * @property {boolean=} forceLinear
    */

   /**
    * @callback SearchComparator
    * @param {*} comparedElement
    * @param {*} needle
    * @returns {number}
    */

   /**
    * @typedef {Object} SearchResult
    * @property {boolean} found
    * @property {number|Array.<number>} index
    */

   var searchAlgorithms = {
      binarySearch: binarySearch,
      linearSearch: linearSearch
   };

   /**
    * Look through a sorted array-like object ("haystack") for an element satisfying a comparison predicate
    * (comparing this element or some part of it with "needle").
    * By default, stops when the first needle is found.
    * Also can be used in 'multiSearch' mode to find the limits of the "range of needles".
    *
    * @param {Array} haystack
    *    Sorted array (or array-like object)
    *
    * @param {*} needle
    *    A value to be used in comparison for each element
    *
    * @param {SearchComparator} comparator
    *    Function that takes the element of haystack as its first parameter, `needle` as its second param, and returns:
    *       - negative value, if it is "less than" the needle element (is placed before needle in haystack)
    *       - positive value, if it is "greater than" the needle element (is placed after needle in haystack)
    *       - 0, if the element is "equal" to the needle element
    *
    * @param {SearchOptions} options
    *    Used to setup the following:
    *    - lowestIndex: the lowest index of the lookup range. By default, lookup starts from the beginning of the array.
    *    - highestIndex: the highest index of the lookup range. By default, lookup finishes at the end of the array.
    *    - multiSearch: if `true`, both the first and the last elements "equal" to the needle should be found.
    *    - forceLinear: if `true`, force using linear search (by default, binary search is used)
    *
    * @returns {SearchResult}
    */
   function search(haystack, needle, comparator, options) {
      options = options || {};
      var lowestIndex   = options.lowestIndex   || 0;
      var highestIndex  = options.highestIndex  || haystack.length - 1;
      var multiSearch   = options.multiSearch   || false;
      var forceLinear   = options.forceLinear   || false;

      var algorithm = forceLinear || highestIndex - lowestIndex < 7 ? 'linearSearch' : 'binarySearch';
      return searchAlgorithms[algorithm](haystack, needle, comparator, multiSearch, lowestIndex, highestIndex);
   }

   return search;

   /**
    * Binary search algorithm implementation
    *
    * Look through a sorted array-like object ("haystack") for an element ("needle") satisfying a comparison predicate.
    * By default, stops when the first needle is found.
    * Also can be used in 'multiSearch' mode to find the limits of the "range of needles".
    *
    * @param {Array} haystack
    * @param {*} needle
    * @param {SearchComparator} comparator
    * @param {boolean} multiSearch
    * @param {number} lowestIndex
    * @param {number} highestIndex
    * @returns {SearchResult} searchResult
    */
   function binarySearch(haystack, needle, comparator, multiSearch, lowestIndex, highestIndex) {
      /**
       *
       * @type {SearchResult}
       */
      var searchResult = {
         found: false,
         index: undefined
      };

      var currentIndex, currentElement, currentElementComparison;
      var cheatingComparators;
      if (multiSearch) {
         cheatingComparators = [function(element, needle) {
            return comparator(element, needle) === 0 ? 1 : -1;
         }, function(element, needle) {
            return comparator(element, needle) === 0 ? -1 : 1;
         }];
      }

      while (lowestIndex <= highestIndex) {
         /* jshint -W016 */
         currentIndex = (lowestIndex + highestIndex) >> 1;
         /* jshint +W016 */
         currentElement = haystack[currentIndex];
         currentElementComparison = comparator(currentElement, needle);

         if (currentElementComparison < 0) {
            lowestIndex = currentIndex + 1;
         }
         else if (currentElementComparison > 0) {
            highestIndex = currentIndex - 1;
         }
         else if (currentElementComparison === 0) {
            searchResult.found = true;
            if (multiSearch) {
               searchResult.index = [
                  search(haystack, needle, cheatingComparators[0], {
                     lowestIndex: lowestIndex, highestIndex: currentIndex
                  }).index[1],
                  search(haystack, needle, cheatingComparators[1], {
                     lowestIndex: currentIndex, highestIndex: highestIndex
                  }).index[0]
               ];
            }
            else {
               searchResult.index = currentIndex;
            }
            break;
         }
         else {
            throw new Error('Comparator failed on element ' + currentIndex);
         }
      }

      if (!searchResult.found) {
         searchResult.index = [highestIndex, lowestIndex];
      }

      return searchResult;
   }


   /**
    *
    * @param {Array} haystack
    * @param {*} needle
    * @param {SearchComparator} comparator
    * @param {boolean} multiSearch
    * @param {number} lowestIndex
    * @param {number} highestIndex
    * @returns {SearchResult} searchResult
    */
   function linearSearch(haystack, needle, comparator, multiSearch, lowestIndex, highestIndex) {
      var searchResult = {
         found: false,
         index: undefined
      };

      var currentIndex = lowestIndex, currentElement, currentElementComparison;
      while (currentIndex <= highestIndex) {
         currentElement = haystack[currentIndex];
         currentElementComparison = comparator(currentElement, needle);
         /* jshint -W035 */
         if (currentElementComparison < 0) {

         }
         else /* jshint +W035 */ if (currentElementComparison > 0) {
            if (!searchResult.found) {
               searchResult.index = [currentIndex - 1, currentIndex];
            }
            break;
         }

         else if (currentElementComparison === 0) {
            searchResult.found = true;
            if (multiSearch) {
               searchResult.index = searchResult.index || [];
               searchResult.index.push(currentIndex);
            }
            else {
               searchResult.index = currentIndex;
               break;
            }
         }
         else {
            throw new Error('Comparator failed on element ' + currentIndex);
         }
         ++currentIndex;
      }

      if (!searchResult.found && searchResult.index === undefined) {
         searchResult.index = [highestIndex, highestIndex + 1];
      }

      return searchResult;
   }
});

