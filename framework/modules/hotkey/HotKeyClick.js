/**

   Usage:
   
      <some-element sw-hot-key-click> (default is "space,enter")
      <some-element sw-hot-key-click="space">
      <some-element sw-hot-key-click="alt+enter">
      <some-element sw-hot-key-click="enter,f10">
      <some-element sw-hot-key-click="f1|body">

   Triggers click event on element where this directive is specified when specified key is pressed.
   See HotKey.js for key specification.
   
*/

define([

   'module',
   'ngModule',
   'swLoggerFactory'
   
   ], function(

   module,
   ngModule,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swHotKeyClick', ['swHotKeyService', function(swHotKeyService)
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            /*jshint unused:true */
            
            var keyComboListAndBindToClosest = attr.swHotKeyClick || 'enter,space';
            logger.trace(keyComboListAndBindToClosest);
            
            var keys = {};
            keys[keyComboListAndBindToClosest] = function click()
            {
               logger.trace('click');
               element.click();
            };

            swHotKeyService.bind(element, keys);
         }
      };
   }]);

});
