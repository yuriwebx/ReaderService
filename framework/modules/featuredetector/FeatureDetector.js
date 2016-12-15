/*global window: false */

define([

   'module',
   'jquery',
   'ngModule',
   'swLoggerFactory',
   './UserAgentDetector'

   ], function(

   module,
   $,
   ngModule,
   swLoggerFactory,
   swUserAgentDetector

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ////////////////////////////////////////////////////////////////////////////

   // https://hacks.mozilla.org/2013/04/detecting-touch-its-the-why-not-the-how/
   // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
   var touch = 'ontouchstart' in window;
   logger.trace('touch', touch);

   ////////////////////////////////////////////////////////////////////////////

   // http://www.abeautifulsite.net/detecting-mobile-devices-with-javascript/
   var ua = window.navigator.userAgent;
   var android = swUserAgentDetector.isAndroid();
   var iOS     = swUserAgentDetector.isIos();
   logger.trace('userAgent:', ua);
   logger.trace('android:', android);
   logger.trace('iOS:', iOS);

   ////////////////////////////////////////////////////////////////////////////

   // http://stackoverflow.com/questions/10193294/how-can-i-tell-if-a-browser-supports-input-type-date
   var inputElem = window.document.createElement('input');

   inputElem.setAttribute('type', 'date');
   var isDateInputTypeSupported = inputElem.type === 'date';
   logger.trace('isDateInputTypeSupported:', isDateInputTypeSupported);

   inputElem.setAttribute('type', 'time');
   var isTimeInputTypeSupported = inputElem.type === 'time';
   logger.trace('isTimeInputTypeSupported:', isTimeInputTypeSupported);

   inputElem = null;

   ////////////////////////////////////////////////////////////////////////////

   ngModule.run([function()
   {
      logger.trace('run');
      $('body').addClass('sw-touch-input-' + (touch ?  'yes' : 'no'));
   }]);

   ////////////////////////////////////////////////////////////////////////////

   ngModule.service('swFeatureDetector', [function()
   {
      logger.trace('register');

      this.isTouchInput = function()
      {
         return touch;
      };

      this.isDesktop = function()
      {
         return !touch;
      };

      this.canRequestFocus = function()
      {
         // For mobile devices, virtual keyboard is only opened if the focus
         // is set within a "user context" (e.g. click, mousedown, mouseup).
         // See http://stackoverflow.com/questions/6837543/show-virtual-keyboard-on-mobile-phones-in-javascript
         // But, unfortunately, it is not true for Android/FF, and iOS since iOS8.
         // And so each time when input is focused programmatically
         // virtual keyboard is opened which is annoying.
         return !touch;
      };

      this.canUseFixedPositionOnFocus = function()
      {
         return !iOS;
      };

      this.isDateInputTypeSupported = function()
      {
         return isDateInputTypeSupported;
      };

      this.isTimeInputTypeSupported = function()
      {
         return isTimeInputTypeSupported;
      };


   }]);

});