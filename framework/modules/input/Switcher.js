/**
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

   ngModule.directive('swInputSwitcher', [function()
   {
      logger.trace('register');

      return {
         restrict: 'C',
         require: 'ngModel',
         compile: function ()
         {
            return function(scope, element, attr, ctrl)
            {

               var ngModel = scope.$eval(attr.ngModel);
               var switcherClasses = {
                  on: 'sw-input-switcher-on',
                  off: 'sw-input-switcher-off'
               };

               ctrl.$render = function()
               {
                  ngModel = ctrl.$modelValue;
                  _switchClasses();
               };

               function _switchClasses()
               {
                  if (ngModel)
                  {
                     element.addClass(switcherClasses.on);
                     element.removeClass(switcherClasses.off);
                  }
                  else
                  {
                     element.addClass(switcherClasses.off);
                     element.removeClass(switcherClasses.on);
                  }
               }

               _switchClasses();

               function _switchButton()
               {
                  ngModel = !ngModel;
                  ctrl.$setViewValue(ngModel);
                  _switchClasses();
               }

               element.on('click', _switchButton);

               element.on('$destroy', function()
               {
                  element.off('click');
               });
            };

         }
      };

   }]);
});
