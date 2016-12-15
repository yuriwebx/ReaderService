/**
 * In-house implementation of number-type input based on text-type one.
 * We have to implement own number-type input since current iOS implementation is not acceptable.
 *
 * Note that this directive is class-restricted
 * (appropriate class is set by sw-input directive - see Input.js).
 *
 * Supports 'min' and 'max' attributes.
 * In case if 'min' and/or 'max' are specified then user input is restricted appropriately.
 *
 * See pl/component/commons/validation/ValidatationService.js
 * See pl/component/commons/validation/Validate.js
 * If 'sw-validate' is specified and returns 'numberRange' constraint then
 * range is automatically reflected to 'min'/'max' attributes.
 */
define([

   'module',
   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   _,
   ng,
   ngModule,
   swLoggerFactory

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swInputNumber', ['$window', 'swValidationService', 'swUtil', function($window, swValidationService, swUtil)
   {
      logger.trace('register');
      
      return {
         restrict: 'C',
         require: 'ngModel',
         compile: function (element)
         {
            if ( !element.is('input[type=text]') )
            {
               throw new Error('\'sw-input-number\' directive is applicable to "input[type=text]" only');
            }
            
            // var NUMBER_REGEXP = /^\s*(\-|\+)?(\d+|(\d*(\.\d*)))\s*$/;
            // The regex above is copy-pasted from Angular.
            // It accepts '.' but parseFloat('.') returns NaN.
            // The regex below rejects '.' but also it rejects '.d*' (leading digit is mandatory)
            var NUMBER_REGEXP = /^\s*(\-|\+)?(\d+\.?\d*)\s*$/;
            
            return function(scope, element, attr, ctrl)
            {
               ////////////////////////////////////////////////////////////////
               // This number input implementation is based on native text input
               // and ngModel of Number type.
               // Since 1.3.0-RC.0 (ngModel: always format the viewValue as a string for text, url and email types (1eda1836))
               // angular automatically converts ngModel to string for text inputs.
               // To resolve the problem we just remove all angular parsers/formatters
               // returning to native text input behavior.
               ctrl.$parsers.splice(0);
               ctrl.$formatters.splice(0);
               ////////////////////////////////////////////////////////////////
               
               var form = element.controller('form');
               var name = attr.name;
               
               var wrapper = element.data('sw-input-wrapper'); // see Input.js
               var disabled;
               var interval;
               
               attr.$observe('disabled', function(value)
               {
                  // disabled="{{expr}}" - value is string
                  // ng-disabled="expr"  - value is boolean
                  if ( ng.isString(value) )
                  {
                     value = value.toLowerCase() === 'true';
                  }
                  
                  disabled = !!value;
                  wrapper.toggleClass('disabled', disabled);
               });
               
               function validate(value)
               {
                  swValidationService.setValidationContextForName(element, form, ctrl, name, {
                     number: {
                        value: value
                     },
                     numberRange: {
                        value: value,
                        min: _parseFloat(element.attr('min')),
                        max: _parseFloat(element.attr('max'))
                     }
                  });
               }
               
               ctrl.$parsers.push(function(value)
               {
                  var empty = swUtil.isEmpty(value);
                  if ( empty || NUMBER_REGEXP.test(value) )
                  {
                     value = empty ? null : parseFloat(value);
                  }
                  validate(value);
                  return value;
               });
               
               ctrl.$formatters.push(function(value)
               {
                  validate(value);
                  return _.isNumber(value) ? '' + value : (swUtil.isEmpty(value) ? '' : value);
               });
               
               function clearInterval()
               {
                  if ( interval )
                  {
                     $window.clearInterval(interval);
                     interval = null;
                  }
               }

               function setInterval(delta)
               {
                  clearInterval();
                  interval = $window.setInterval(function()
                  {
                     inc(delta);
                  },
                  200);
               }

               function bindMouse(element, delta)
               {
                  element.bind('click', function()
                  {
                     inc(delta);
                  });
                  
                  element.bind('mousedown touchstart', function()
                  {
                     setInterval(delta);
                     var doc = ng.element($window.document);
                     doc.one('mouseup mousemove touchend touchcancel touchmove', clearInterval);
                  });
               }
               
               bindMouse(wrapper.find('.sw-input-number-buttonUp'  ),  1);
               bindMouse(wrapper.find('.sw-input-number-buttonDown'), -1);
               
               element.on('$destroy', function()
               {
                  clearInterval();
               });
               
               wrapper.bind('keydown', function(event)
               {
                  if ( event.keyCode === 38 ) // up arrow
                  {
                     inc(+1);
                  }
                  if ( event.keyCode === 40 ) // down arrow
                  {
                     inc(-1);
                  }
               });
               
               function inc(delta)
               {
                  if ( !disabled )
                  {
                     var min = _parseFloat(element.attr('min'));
                     var max = _parseFloat(element.attr('max'));
                     
                     scope.$apply(function()
                     {
                        var value = ctrl.$modelValue;
                        if ( _.isNumber(value) )
                        {
                           value += delta;
                           if ( _.isNumber(min) && value < min )
                           {
                              value = min;
                           }
                           if ( _.isNumber(max) && value > max )
                           {
                              value = max;
                           }
                        }
                        else
                        {
                           value = 0;
                           if ( delta > 0 && _.isNumber(min) )
                           {
                              value = min;
                           }
                           if ( delta < 0 && _.isNumber(max) )
                           {
                              value = max;
                           }
                        }
                        
                        //////////////////////////////////////////////////////////////////////////////
                        // to avoid float point truncation errors like 1.99999999999999999999999999997
                        value = value > 0 ?
                           Math.floor(value * 100000 + 0.5) / 100000 :
                           Math.ceil (value * 100000 - 0.5) / 100000;
                        //////////////////////////////////////////////////////////////////////////////
                        
                        var svalue = '' + value;
                        element.val(svalue);
                        ctrl.$setViewValue(svalue);
                     });
                  }
               }
               
               function _parseFloat(s)
               {
                  return NUMBER_REGEXP.test(s) ? parseFloat(s) : undefined;
               }
            };
            
         }
      };
      
   }]);
});
