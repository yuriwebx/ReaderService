define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'text!./TimeInput.html',
   'less!./TimeInput',
   'maskedinput'
   ],
   function(module, _, ngModule, swLoggerFactory, timeInputTemplate)
   {
      'use strict';
      
      var logger = swLoggerFactory.getLogger(module.id);
      logger.trace('create');
   
      ngModule.directive('swTimeInput',
            [  'swI18nService',
      function( swI18nService )
      {
         logger.trace('register');
         
         return {
            restrict: 'E',
            template: timeInputTemplate,
            replace: true,
            require: 'ngModel',
            scope: true,
            link: function(scope, element, attr, ctrl)
            {
               /*jshint unused:true */
               
               // Please note that we rely on directive that applied
               // here via "sw-input-time" class (see DateTime.js).
               
               scope.timeFieldRaw = '';
               
               var wrapper = element.data('sw-input-wrapper'); // see Input.js

               var timeMask = swI18nService.getTimeMask();
               var timeInputMask = timeMask.replace(/[HM]/gi,'9');
               var placeholder = timeInputMask.replace(/9/g,'_');
               
               var timeInput = element.find('.sw-timeInput-input');
               timeInput.mask(timeInputMask, {autoclear: false});
               timeInput.attr('placeholder', placeholder);
               
               attr.$observe('disabled', function(value)
               {
                  // disabled="{{expr}}" - value is string
                  // ng-disabled="expr"  - value is boolean
                  if ( _.isString(value) )
                  {
                     value = value.toLowerCase() === 'true';
                  }
                  
                  var disabled = !!value;
                  wrapper.toggleClass('disabled', disabled);
                  timeInput.prop('disabled', disabled);
               });
               
               scope.timeEntered = function()
               {
                  ctrl.$setViewValue(
                        scope.timeFieldRaw === placeholder ? '' : scope.timeFieldRaw);
               };
               
               ctrl.$render = function()
               {
                  scope.timeFieldRaw = ctrl.$viewValue || placeholder;
               };

            }
         };
      }]);
   }
);
