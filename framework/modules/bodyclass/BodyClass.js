/**

   Usage:
      <some-element sw-body-class="someclass">
      
   Add    specified class to   BODY when element is added to DOM.
   Remove specified class from BODY when element is destroyed.

*/

define([

   'module',
   'jquery',
   'ngModule',
   'swLoggerFactory'
   
   ], function(

   module,
   $,
   ngModule,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   var body = $('body');
   
   ngModule.directive('swBodyClass', [function()
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            /*jshint unused:true */
            var cls = attr.swBodyClass;
            
            logger.trace('add', scope.$id, cls);
            body.addClass(cls);
            
            element.on('$destroy', function()
            {
               logger.trace('destroy', scope.$id, cls);
               body.removeClass(cls);
            });
         }
      };
   }]);

});
