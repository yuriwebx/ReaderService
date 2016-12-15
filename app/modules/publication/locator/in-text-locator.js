define(['./paragraph-locator'], function(ParagraphLocator) {
   'use strict';

   /**
    * Locator for a specific position in the text of the paragraph of Publication
    *
    * @constructor
    * @extends {ParagraphLocator}
    * @param {string} paragraphId
    * @param {number} logicalCharOffset
    *    Index of the stable (non-whitespace) character immediately following the located point
    *    (0 for the position at the beginning of the paragraph's text)
    */
   function InTextLocator(paragraphId, logicalCharOffset) {
      /* jshint -W018 */
      if (!(logicalCharOffset >= 0)) {
         throw new Error('Logical character offset should be a number, equal or greater than 0');
      }
      /* jshint +W018 */

      ParagraphLocator.call(this, paragraphId);
      this.logicalCharOffset = +logicalCharOffset;
   }

   InTextLocator.prototype = Object.create(ParagraphLocator.prototype);
   InTextLocator.prototype.constructor = InTextLocator;

   /**
    *
    * @param {InTextLocator|PublicationLocator} locator
    * @returns {number}
    */
   InTextLocator.prototype.compareTo = function compareTo(locator) {
      var comparisonResult;
      if (locator.constructor === InTextLocator) {
         comparisonResult = this.compareBasisTo(locator) || this.logicalCharOffset - locator.logicalCharOffset;
      }
      else if (locator.constructor === ParagraphLocator) {
         comparisonResult = this.compareBasisTo(locator);
      }
      else {
         comparisonResult = -locator.compareTo(this) || 0;
      }
      return comparisonResult;
   };

   return InTextLocator;
});