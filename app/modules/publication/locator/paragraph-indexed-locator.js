define(['./paragraph-locator'], function(ParagraphLocator) {
   'use strict';

   /**
    * Locator for a specific block position before or after the specific paragraph of Publication
    *
    * @constructor
    * @extends {ParagraphLocator}
    * @param {string} paragraphId
    * @param {number} index
    *    Negative, if locator points above the paragraph
    *    Positive, if locator points below the paragraph
    */
   function ParagraphIndexedLocator(paragraphId, index) {
      if (!(index < 0 || index > 0)) {
         throw new Error('Paragraph index (' + JSON.stringify(index) +
            ') should be numeric, either less than or greater than zero');
      }

      ParagraphLocator.call(this, paragraphId);
      this.index = +index;
   }

   ParagraphIndexedLocator.prototype = Object.create(ParagraphLocator.prototype);
   ParagraphIndexedLocator.prototype.constructor = ParagraphIndexedLocator;

   /**
    *
    * @param {ParagraphIndexedLocator} locator
    * @returns {number}
    */
   ParagraphIndexedLocator.prototype.compareTo = function compareTo(locator) {
      return this.compareBasisTo(locator) ||
         (locator.constructor === ParagraphIndexedLocator ? this.index - locator.index : this.index);
   };

   return ParagraphIndexedLocator;
});