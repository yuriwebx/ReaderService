/**
 * Angular directive that enhances <sw-input type="time">.
 *
 * Note that this directive is class-restricted
 * (appropriate class is set by sw-input directive - see pl/component/commons/input/Input.js).
 *
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
   
   var INPUT_TIME_FORMAT = 'HH:mm';
   // TODO enhance DateService/ValidationService to encapsulate
   // info about internal/external date/time formats 
   
   ngModule.directive('swInputTime', [
      'swFeatureDetector',
      'swValidationService',
      'swDateService',
   function(
      swFeatureDetector,
      swValidationService,
      swDateService
   )
   {
      logger.trace('register');
      
      return {
         restrict: 'C',
         require: 'ngModel',
         compile: function (element)
         {
            if ( !element.is('input[type=time]') )
            {
               throw new Error('\'sw-input-time\' directive is applicable to "input[type=time]" only');
            }
            
            return function(scope, element, attr, ctrl)
            {
               /*jshint unused:true */
               
               ////////////////////////////////////////////////////////////////
               // Since angular 1.3 the "ng-model" of date|time inputs assumed to be of Date type.
               // It's hard to understand why angular team decided to break so abruptly
               // existing application based on ISO 8601 :(
               // To resolve the problem we just remove all angular parsers/formatters
               // returning to native date|time input behavior.
               ctrl.$parsers.splice(0);
               ctrl.$formatters.splice(0);
               ////////////////////////////////////////////////////////////////
               
               var isTimeInputTypeSupported = swFeatureDetector.isTimeInputTypeSupported();

               var form = element.controller('form');
               var name = attr.name;
               
               function validate(value)
               {
                  swValidationService.setValidationContextForName(
                        element, form, ctrl, name, {time: {value: value}});
               }
               
               function validateFormat(value)
               {
                  swValidationService.setValidationContextForName(
                        element, form, ctrl, name, {timeFormat: {value: value, format: INPUT_TIME_FORMAT}});
               }
               
               ctrl.$parsers.push(function(value)
               {
                  if ( isTimeInputTypeSupported )
                  {
                     validate(value);
                     return value;
                  }
                  else
                  {
                     validateFormat(value);
                     var v = _.isEmpty(value) ? '' : swDateService.parseTime(value, INPUT_TIME_FORMAT);
                     return v;
                  }
               });
               
               ctrl.$formatters.push(function(value)
               {
                  if ( isTimeInputTypeSupported )
                  {
                     validate(value);
                     return value;
                  }
                  else
                  {
                     validate(value);
                     var v = _.isEmpty(value) ? '' : swDateService.formatTime(value, INPUT_TIME_FORMAT);
                     validateFormat(v);
                     return v;
                  }
               });
               
            };
            
         }
      };
      
   }]);
});
