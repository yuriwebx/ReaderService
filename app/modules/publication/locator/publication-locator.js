define([], function() {
   'use strict';

   /**
    * Base locator
    *
    * @constructor
    */
   function PublicationLocator() {}

   PublicationLocator.prototype = {
      constructor: PublicationLocator,

      /**
       * @abstract
       *
       * @param {PublicationLocator} locator
       * @returns {number}
       */
      compareTo: function compareTo(locator) {
         throw new Error(locator.constructor.name + ': comparison algorithm must be implemented by subclass');
      },

      /**
       * @abstract
       *
       * @param {PublicationLocator} locator
       * @returns {number}
       */
      compareBasisTo: function compareBasisTo(locator) {
         throw new Error(locator.constructor.name + ': basis comparison algorithm must be implemented by subclass');
      },

      /**
       *
       * @param {PublicationLocator} locator
       * @returns {boolean}
       */
      equals: function equals(locator) {
         return this.compareTo(locator) === 0;
      },

      /**
       *
       * @param {PublicationLocator} locator
       * @returns {boolean}
       */
      equalsByBasis: function equalsByBasis(locator) {
         return this.compareBasisTo(locator) === 0;
      },
      /**
       *
       * @param {PublicationLocator} locator
       * @returns {boolean}
       */
      follows: function follows(locator) {
         return this.compareTo(locator) > 0;
      },

      /**
       *
       * @param {PublicationLocator} locator
       * @returns {boolean}
       */
      precedes: function precedes(locator) {
         return this.compareTo(locator) < 0;
      }
   };

   return PublicationLocator;
});