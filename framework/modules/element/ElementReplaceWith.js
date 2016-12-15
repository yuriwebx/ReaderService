/**

   Usage:
      <some-element sw-element-replace-with="DomElement-expr">
      
   - evaluate "DomElement-expr"
   - replace <some-element> with result of evaluation
   - merge classes of original and evaluated elements 
      
*/

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

   var dirName = 'swElementReplaceWith';
   
   ngModule.directive(dirName, [function()
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function($scope, $element, $attr)
         {
            var element = $scope.$eval($attr[dirName]);
            if ( !_.isElement(element) )
            {
               throw new Error('DOM element expected');
            }
            
            $(element).addClass($element[0].className);
            
            $element.replaceWith(element);
         }
      };
   }]);

});
