/**

   Usage:
   
      <some-element sw-hot-key="{keyComboList1|bindToClosestSelector1: 'expr1', keyComboList2: 'expr2', ...}">

   Evaluate specified expression when user presses specified key.
   For example,
   
      <div sw-hot-key="{
         enter: 'submit()',
         tab: 'process(\'forward\')',
         'shift+tab': 'process(\'backward\')',
         'ctrl+up, ctrl+down': 'updown(key)',
         'shift+left, shift+right': 'leftright(key)',
         'f1|body': 'help()',
         'ctrl+i|.hot-key-closest': 'info()',
      }">

   If "bindToClosestSelector" is not specified then key handler is bound to element where this directive is specified.
   If "bindToClosestSelector" is specified then key handler is bound to element.closest(bindToClosestSelector)
      
   Please note that variables with names "$event", "key" can be used in "expr".
      "$event" is an Event object
      "key"    is an object with properties
         name:  "a"-"z", "0"-"9", "enter", "esc" etc (please see all supported names in HotKeyService.js)
         code:  key code
         ctrl:  boolean 
         shift: boolean
         alt:   boolean
   
*/

define([

   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory'
   
   ], function(

   module,
   _,
   ngModule,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swHotKey', ['$parse', 'swHotKeyService', function($parse, swHotKeyService)
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            
            var keys = {};
            
            _.each(scope.$eval(attr.swHotKey), function(callbackExpr, keyComboListAndBindToClosest)
            {
               logger.trace(keyComboListAndBindToClosest, ':', callbackExpr);
               
               var callbackExprParsed = $parse(callbackExpr);
               var callback = function(local)
               {
                  scope.$apply(function()
                  {
                     callbackExprParsed(scope, local);
                  });
               };
               
               keys[keyComboListAndBindToClosest] = callback;
               
            });
            
            swHotKeyService.bind(element, keys);
            
         }
      };
   }]);

});
