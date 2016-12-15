define([
   './locator/publication-locator',
   './locator/publication-start-locator',
   './locator/publication-end-locator',
   './locator/paragraph-locator',
   './locator/paragraph-indexed-locator',
   './locator/in-text-locator',
   './locator/range-locator',
   './locator/in-text-range-locator'
], function(PublicationLocator, PublicationStartLocator, PublicationEndLocator,
            ParagraphLocator, ParagraphIndexedLocator, InTextLocator,
            RangeLocator, InTextRangeLocator)
{
   'use strict';

   var RANGE_SEPARATOR = '--';
   var INDEX_SEPARATOR = '_';
   var OFFSET_SEPARATOR = '.';

   /** Augment base class using factory methods */
   PublicationLocator.prototype.serialize = function() {
      return serializeLocator(this);
   };

   PublicationLocator.prototype.toJSON = PublicationLocator.prototype.serialize;

   PublicationLocator.prototype.toString = function() {
      return this.constructor.name + '[' + this.serialize() + ']';
   };

   /** Locator (exported namespace) **/
   var Locator = {
      PublicationLocator: PublicationLocator,
      PublicationStartLocator: PublicationStartLocator,
      PublicationEndLocator: PublicationEndLocator,

      ParagraphLocator: ParagraphLocator,
      ParagraphIndexedLocator: ParagraphIndexedLocator,
      InTextLocator: InTextLocator,

      RangeLocator: RangeLocator,
      InTextRangeLocator: InTextRangeLocator
   };

   Locator.serialize = serializeLocator;
   Locator.deserialize = deserializeLocator;

   return Locator;

   /**
    * Create a string representation for Locator
    *
    * @param {ParagraphLocator|ParagraphIndexedLocator|InTextLocator|RangeLocator|PublicationLocator} locator
    * @returns {string}
    */
   function serializeLocator(locator) {
      switch(locator.constructor) {
         case PublicationLocator:
            throw new Error('Attempt to serialize PublicationLocator');
         case PublicationStartLocator:
            return '';
         case PublicationEndLocator:
            return '-';

         case ParagraphLocator:
            return _serializeParagraphLocator(locator);
         case ParagraphIndexedLocator:
            return _serializeParagraphLocator(locator) + INDEX_SEPARATOR + locator.index;
         case InTextLocator:
            return _serializeParagraphLocator(locator) + OFFSET_SEPARATOR + locator.logicalCharOffset;

         case InTextRangeLocator:
            if (locator.startLocator.equalsByBasis(locator.endLocator)) {
               return serializeLocator(locator.startLocator) + OFFSET_SEPARATOR + locator.endLocator.logicalCharOffset;
            }
            /* falls through */
         case RangeLocator:
            return serializeLocator(locator.startLocator) + RANGE_SEPARATOR + serializeLocator(locator.endLocator);
         default:
            throw new Error('Attempt to serialize unknown Locator');
      }
   }

   /**
    * Create a specific Locator instance from its serialization
    *
    * @param {string} str
   * @returns {PublicationLocator}
    */
   function deserializeLocator(str) {
      var separatorIndex, lastSeparatorIndex, paragraphId, startLocator, endLocator;
      if (str === '') {
         return new PublicationStartLocator();
      }
      if (str === '-') {
         return new PublicationEndLocator();
      }

      // '--' check
      if (-1 !== (separatorIndex = str.indexOf(RANGE_SEPARATOR))) {
         startLocator = deserializeLocator(str.slice(0, separatorIndex));
         endLocator = deserializeLocator(str.slice(separatorIndex + RANGE_SEPARATOR.length));

         /* jshint -W056 */
         return new (startLocator.constructor === InTextLocator && endLocator.constructor === InTextLocator ?
            InTextRangeLocator : RangeLocator)
         (startLocator, endLocator);
         /* jshint +W056 */
      }

      // '_' check
      if (-1 !== (separatorIndex = str.indexOf(INDEX_SEPARATOR))) {
         paragraphId = str.slice(0, separatorIndex);
         return new ParagraphIndexedLocator(paragraphId, str.slice(separatorIndex + INDEX_SEPARATOR.length));
      }

      // '.' check
      if (-1 !== (separatorIndex = str.indexOf(OFFSET_SEPARATOR))) {
         lastSeparatorIndex = str.lastIndexOf(OFFSET_SEPARATOR);
         if (separatorIndex === lastSeparatorIndex) {
            return new InTextLocator(str.slice(0, separatorIndex), str.slice(separatorIndex + OFFSET_SEPARATOR.length));
         }
         paragraphId = str.slice(0, separatorIndex);
         startLocator = new InTextLocator(paragraphId, str.slice(separatorIndex + OFFSET_SEPARATOR.length, lastSeparatorIndex));
         endLocator = new InTextLocator(paragraphId, str.slice(lastSeparatorIndex + OFFSET_SEPARATOR.length));
         return new InTextRangeLocator(startLocator, endLocator);
      }

      return new ParagraphLocator(str);
   }

   /**
    *
    * @param {ParagraphLocator} locator
    * @returns {string}
    * @private
    */
   function _serializeParagraphLocator(locator) {
      return '' + locator._paragraphNumber + locator._paragraphSuffix;
   }
});