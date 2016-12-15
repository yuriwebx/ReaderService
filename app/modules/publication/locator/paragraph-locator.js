define(['./publication-locator'], function(PublicationLocator) {
   'use strict';

   var paragraphIdPattern = /^\D*(\d+)(\D*)$/;

   /**
    * Locator for a paragraph of Publication
    *
    * @constructor
    * @extends {PublicationLocator}
    * @param {string} paragraphId
    */
   function ParagraphLocator(paragraphId) {
      var matches = paragraphIdPattern.exec(paragraphId);
      if (matches === null) {
         throw new Error('Paragraph ID (' + paragraphId + ') does not match pattern ' + paragraphIdPattern.source);
      }

      PublicationLocator.call(this);
      this._paragraphNumber = +matches[1];
      this._paragraphSuffix = matches[2];

      this.paragraphId = this._paragraphNumber + this._paragraphSuffix;
      this.prefixedParagraphId = 'para_' + this.paragraphId;
   }

   ParagraphLocator.prototype = Object.create(PublicationLocator.prototype);
   ParagraphLocator.prototype.constructor = ParagraphLocator;

   /**
    * @override
    *
    * @param {ParagraphLocator|PublicationLocator} locator
    * @returns {number}
    */
   ParagraphLocator.prototype.compareTo = function compareTo(locator) {
      return locator.constructor === ParagraphLocator ?
         _compareParagraphs(this, locator)            :
         -locator.compareTo(this) || 0                ;
   };

   /**
    * @override
    *
    * @param {ParagraphLocator|PublicationLocator} locator
    * @returns {number}
    */
   ParagraphLocator.prototype.compareBasisTo = function compareBasisTo(locator) {
      return locator instanceof ParagraphLocator   ?
         _compareParagraphs(this, locator)         :
         -locator.compareBasisTo(this) || 0        ;
   };

   return ParagraphLocator;

   /**
    *
    * @param {ParagraphLocator} a
    * @param {ParagraphLocator} b
    * @returns {number}
    * @private
    */
   function _compareParagraphs(a, b) {
      return a._paragraphNumber - b._paragraphNumber  ||  a._paragraphSuffix.localeCompare(b._paragraphSuffix);
   }
});