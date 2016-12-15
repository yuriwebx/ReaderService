define(['./publication-locator'], function(PublicationLocator) {
   'use strict';

   /**
    * Locator attached to the end of Publication
    *
    * @constructor
    * @extends {PublicationLocator}
    */
   function PublicationEndLocator() {
      PublicationLocator.call(this);
   }

   PublicationEndLocator.prototype = Object.create(PublicationLocator.prototype);
   PublicationEndLocator.prototype.constructor = PublicationEndLocator;

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    */
   PublicationEndLocator.prototype.compareTo = function compareTo(locator) {
      return _comparePublicationEndWith(locator);
   };

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    */
   PublicationEndLocator.prototype.compareBasisTo = function compareBasisTo(locator) {
      return _comparePublicationEndWith(locator);
   };

   return PublicationEndLocator;

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {number}
    * @private
    */
   function _comparePublicationEndWith(locator) {
      return locator.constructor === PublicationEndLocator ? 0 : 1;
   }
});