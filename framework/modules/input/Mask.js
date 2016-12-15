define([
   'module',
   'ngModule',
   'swLoggerFactory',
   'maskedinput'
   ],
   function(module, ngModule, swLoggerFactory)
   {
      'use strict';
      
      var logger = swLoggerFactory.getLogger(module.id);
      logger.trace('create');
   
      ngModule.directive('swInputMask', [function()
      {
         logger.trace('register');
         
         return {
            restrict: 'C',
            require: 'ngModel',
            link: function (scope, element, attrs, ctrl)
            {
               /*jshint unused:true */

               if(!element.is('input[type=text]'))
               {
                  throw new Error('\'sw-input-mask\' directive is applicable to "input[type=text]" only');
               }
               
               ctrl.$parsers.push(function()
               {
                  return element.mask();
               });
               
               ctrl.$formatters.push(function(value)
               {
                  element.val(value);
                  element.trigger('paste');
                  return element.val();
               });
               
               attrs.$observe('swMask', function(mask)
               {
                  element.attr('placeholder', mask.replace(/[\*a9]/g,'_'));
                  element.mask(mask, {autoclear: false, shiftByUnit: false});
                  element.trigger('paste');
               });
               
            }
         };
      }]);
   }
);
