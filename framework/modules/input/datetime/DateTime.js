/**
 * Angular directive that enhances <sw-input type="date">.
 *
 * Note that this directive is class-restricted
 * (appropriate class is set by sw-input directive - see Input.js).
 *
 * Presets 'min' and 'max' attributes with
 * swValidationService.getMinDate()
 * swValidationService.getMaxDate()
 * see infl/commons/util/DateService.js
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
   
   function _registerDirective(type)
   {
      var typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

      ngModule.directive('swInput' + typeCapitalized, [
         'swFeatureDetector',
         'swI18nService',
         'swValidationService',
         'swDateService',
      function(
         swFeatureDetector,
         swI18nService,
         swValidationService,
         swDateService
      )
      {
         logger.trace('register', type);
         
         return {
            restrict: 'C',
            require: 'ngModel',
            compile: function()
            {
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
                  
                  var isInputTypeSupported = element.is('input') &&
                            swFeatureDetector['is' + typeCapitalized + 'InputTypeSupported']();
                  
                  var format = swI18nService['get' + typeCapitalized + 'Mask']();
                  
                  if ( type === 'date' )
                  {
                     attr.$set('min', swValidationService.getMinDate());
                     attr.$set('max', swValidationService.getMaxDate());
                  }
                  
                  var form = element.controller('form');
                  var name = attr.name;
                  
                  function validate(value, format)
                  {
                     var token = {};
                     token[type] = {value: value, format: format};
                     
                     swValidationService.setValidationContextForName(
                           element, form, ctrl, name, token);
                  }
                  
                  ctrl.$parsers.push(function(value)
                  {
                     if ( isInputTypeSupported )
                     {
                        validate(value);
                        return value;
                     }
                     else
                     {
                        validate(value, format);
                        var v = _.isEmpty(value) ? '' : swDateService['parse' + typeCapitalized](value, format);
                        return v;
                     }
                  });
                  
                  ctrl.$formatters.push(function(value)
                  {
                     if ( isInputTypeSupported )
                     {
                        validate(value);
                        return value;
                     }
                     else
                     {
                        validate(value);
                        var v = _.isEmpty(value) ? '' : swDateService['format' + typeCapitalized](value, format);
                        return v;
                     }
                  });
               };
            }
         };
      }]);
   } // end of '_registerDirective'

   _registerDirective('date');
   _registerDirective('time');
   
});
