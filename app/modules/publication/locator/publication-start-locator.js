define(['./publication-locator'], function(PublicationLocator) {
   'use strict';

   /**
    * Locator attached to the start of Publication
    *
    * @constructor
    * @extends {PublicationLocator}
    */
   function PublicationStartLocator() {
      PublicationLocator.call(this);
   }

   PublicationStartLocator.prototype = Object.create(PublicationLocator.prototype);
   PublicationStartLocator.prototype.constructor = PublicationStartLocator;

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    */
   PublicationStartLocator.prototype.compareTo = function compareTo(locator) {
      return _comparePublicationStartWith(locator);
   };

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    */
   PublicationStartLocator.prototype.compareBasisTo = function compareBasisTo(locator) {
      return _comparePublicationStartWith(locator);
   };

   return PublicationStartLocator;

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    * @private
    */
   function _comparePublicationStartWith(locator) {
      return locator.constructor === PublicationStartLocator ? 0 : -1;
   }
});