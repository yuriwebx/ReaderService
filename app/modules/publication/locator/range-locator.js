define(['./publication-locator'], function(PublicationLocator) {
   'use strict';

   /**
    *
    * @constructor
    * @extends {PublicationLocator}
    * @param {PublicationLocator} startLocator
    * @param {PublicationLocator} endLocator
    */
   function RangeLocator(startLocator, endLocator) {
      if (endLocator.precedes(startLocator)) {
         throw new Error('Incorrect RangeLocator: end ' + endLocator + ' should never precede start ' + startLocator);
      }

      PublicationLocator.call(this);
      this.startLocator = startLocator;
      this.endLocator = endLocator;
   }

   RangeLocator.prototype = Object.create(PublicationLocator.prototype);
   RangeLocator.prototype.constructor = RangeLocator;

   /**
    *
    * @param {RangeLocator|PublicationLocator} locator
    * @returns {number}
    */
   RangeLocator.prototype.compareTo = function compareTo(locator) {
      var comparisonResult;
      if (locator instanceof RangeLocator) {
         comparisonResult = this.startLocator.compareTo(locator.startLocator) ||
            this.endLocator.compareTo(locator.endLocator);
      }
      else {
         comparisonResult = this.startLocator.compareTo(locator) > 0 ? 1
            : this.endLocator.compareTo(locator) < 0 ? -1 : 0;
      }
      return comparisonResult;
   };

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {boolean}
    */
   RangeLocator.prototype.contains = function contains(locator) {
      return !(this.startLocator.follows(locator) || this.endLocator.precedes(locator));
   };

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {boolean}
    */
   RangeLocator.prototype.startsFrom = function startsFrom(locator) {
      return this.startLocator.equals(locator);
   };

   /**
    *
    * @param {PublicationLocator} locator
    * @returns {boolean}
    */
   RangeLocator.prototype.endsWith = function endsWith(locator) {
      return this.endLocator.equals(locator);
   };

   /**
    *
    * @returns {boolean}
    */
   RangeLocator.prototype.isCollapsed = function isCollapsed() {
      return this.startLocator.equals(this.endLocator);
   };

   return RangeLocator;
});
