/*global window*/
define([
   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory'
], function(
   module,
   _,
   $,
   ngModule,
   swLoggerFactory
){
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var UserAgentDetector = {
      isIos: function () {
         return _check(/iphone|ipod|ipad/i, 'isIos');
      },
      isIos8: function () {
         return _check(/(?:iphone|ipod|ipad).* os 8_/i, 'isIos8');
      },
      isAndroid: function () {
         return _check(/android/i, 'isAndroid');
      }
   };

   function _check(regex, propName) {
      var deviceAgent = window.navigator.userAgent;
      var test = regex.test(deviceAgent);
      UserAgentDetector[propName] = function () {return test;};

      return test;
   }

   ////////////////////////////////////////////////////////////////////////////

   ngModule.run([function()
   {
      logger.trace('run');
      $('body').addClass('sw-user-agent-' + (UserAgentDetector.isIos() ? 'ios' : UserAgentDetector.isAndroid() ? 'android' : 'desktop'));
   }]);

   ////////////////////////////////////////////////////////////////////////////

   ngModule.service('swUserAgentDetector', [function()
   {
      logger.trace('register');
      _.extend(this, UserAgentDetector);
   }]);

   return UserAgentDetector;

});