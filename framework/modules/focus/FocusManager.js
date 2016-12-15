/**
 * 
 * Usage:
 * 
 *    <some-element sw-focus-manager="model-expr">
 *    Create FocusManager on this element.
 *    See details in FocusManagerService.js.
 *    
 * Example:
 * 
 *    <div sw-focus-manager="{cycle: false, traverse: true, keyNext: 'down', keyPrev: 'up'}">
 * 
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
   
   var NAME_DIR = 'swFocusManager';
   
   ngModule.directive(NAME_DIR, ['swFocusManagerService', function(swFocusManagerService)
   {
      logger.trace('register');
      
      return {
         restrict: 'A',
         link: function($scope, $element, $attr)
         {
            var model = $scope.$eval($attr[NAME_DIR]) || {};
            swFocusManagerService.createInstance(model, $scope, $element);
         }
      };
   }]);
   
});
