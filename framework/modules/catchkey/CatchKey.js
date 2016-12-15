/**

   Usage:
      <some-input-element sw-catch-key>

   Intended to redirect all keyboard input to this input
   in case when current focused element is not text input.
   Useful to catch events from barcode scanner even if
   input field is not focused.
   
   Listen to "keydown" events on <body> and focus this input
   if "event.target" is not text input element.
   
   DOES NOT WORK in iOS

*/

define([

   'module',
   'underscore',
   'ngModule',
   'jquery',
   'swLoggerFactory'
   
   ], function(

   module,
   _,
   ngModule,
   $,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swCatchKey', ['swUserInputBlockerRegistry', function(swUserInputBlockerRegistry)
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function(scope, element)
         {
            function handler(event)
            {
               var  t =   event.target;
               var $t = $(event.target);
               
               if ( logger.isTraceEnabled() )
               {
                  logger.trace('keydown', event.keyCode, t.nodeName, t.type, t.className);
               }
               
               if ( swUserInputBlockerRegistry.isElementBlocked(element[0]) )
               {
                  logger.trace('blocked');
                  return;
               }
               
               var catchFlag = true;
               if ( event.keyCode === 32 )
               {
                  // ignore "space" key to not prevent default key action on inputs 
                  catchFlag = false;
               }
               else if ( $t.is('input') )
               {
                  var type = (t.type || 'text').toLowerCase();
                  catchFlag = !_.contains(['text', 'date', 'time', 'password'], type);
               }
               else if ( $t.is('textarea') )
               {
                  catchFlag = false;
               }
               if ( catchFlag )
               {
                  element.focus();
               }
            }
            
            var body = $('body');
            body.on('keydown', handler);
   
            element.on('$destroy', function()
            {
               logger.trace('destroy', scope.$id);
               body.off('keydown', handler);
            });
         }
      };
   }]);

});