/**

Usage:
   <div sw-compile="htmlStringExpr"/>

When value of 'sw-compile' attribute is changed to non-empty value then new scope is created,
element content is set to this value and processed in this new scope.
When value of 'sw-compile' attribute is changed to empty value then scope is destroyed and element is cleared.
It means that element content is removed from DOM and all scope resources are freed.
 
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
   
   var dirName = 'swCompile';
   
   ngModule.directive(dirName, ['$compile', function($compile)
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         priority: 500,
         terminal: true,
         link: function(scope, element, attr)
         {
            var _scope;
            scope.$watch(attr[dirName], function(value)
            {
               if ( _scope )
               {
                  _scope.$destroy();
                  _scope = null;
               }
               if ( value )
               {
                  _scope = scope.$new();
                  element.html(value);
                  $compile(element.contents())(_scope);
               }
               else
               {
                  element.html('');
               }
            });
         }
      };
   
   }]);

});
