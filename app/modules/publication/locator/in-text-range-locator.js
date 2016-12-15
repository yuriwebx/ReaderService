define(['./range-locator', './in-text-locator'], function(RangeLocator, InTextLocator) {
   'use strict';

   /**
    * @constructor
    * @extends {RangeLocator}
    * @param {InTextLocator} startLocator
    * @param {InTextLocator} endLocator
    */
   function InTextRangeLocator(startLocator, endLocator) {
      if (startLocator.constructor !== InTextLocator) {
         throw new Error(startLocator.constructor.name + ' should not be used to start InTextRangeLocator');
      }
      if (endLocator.constructor !== InTextLocator) {
         throw new Error(endLocator.constructor.name + ' should not be used to end InTextRangeLocator');
      }

      RangeLocator.call(this, startLocator, endLocator);
   }

   InTextRangeLocator.prototype = Object.create(RangeLocator.prototype);
   InTextRangeLocator.prototype.constructor = InTextRangeLocator;

   return InTextRangeLocator;
});