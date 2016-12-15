/**
 * Directives intended to assign validation constraints to inputs.
 *
 * <input sw-validate="expr">
 *
 * The most generic form.
 * Expression should be evaluated as object of validation constraints (see ValidationService.js).
 * Input name and model are put to local scope (with 'name' and 'value' names) before evaluation.
 *
 * For example:
 *
 * <sw-input name="aName" ng-model="aModel" sw-validate="{ numberRange: { value: value, min: 100 } }"></sw-input>
 *
 * <sw-input name="aName" ng-model="aModel" sw-validate="customRequiredValidator(name, value)"></sw-input>
 * $scope.customRequiredValidator = function(name, value)
 * {
 *    return {
 *       customRequired: {
 *          valid: !value,
 *          name: name,
 *          value: value,
 *          message: 'customMessageKey' // {{name}}, {{value}} can be used in text
 *       }
 *    };
 * };
 *
 *
 *
 * <input sw-required="boolExpr">
 * Short form of 'required' validation constraint type.
 * 'boolExpr' is considered as validation constraint context 'active' property
 *
 * <input sw-maxlength="intExpr">
 * Short form of 'maxlength' validation constraint type.
 * 'intExpr' is considered as validation constraint context 'maxlength' property
 *
 * <input sw-future="boolExpr">
 * <input sw-past="boolExpr">
 * Short form of 'future'/'past' validation constraint type.
 * 'boolExpr' is considered as validation constraint context 'active' property
 *
 * <input sw-alpha>
 * <input sw-numeric>
 * <input sw-alpha-numeric>
 * Short form of 'alpha'/'numeric'/alphanumeric validation constraint type.
 * Attribute value currently does not matter.
 *
 * <input sw-allowed-chars>
 * Short form of 'allowedChars' validation constraint type.
 * Attribute value currently does not matter.
 *
 * See ValidationService.js
 *
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
   
   function _process(dirName, watchFnCtor)
   {
      ngModule.directive(dirName, ['$parse', 'swValidationService', function($parse, swValidationService)
      {
         logger.trace('register', dirName);
         return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attr, ctrl)
            {
                var form = element.controller('form');
                if ( !form )
                {
                   throw new Error('"ng-form" attribute must be specified');
                }
                
                var name = attr.name;
                if ( !name )
                {
                   throw new Error('"name" attribute must be specified');
                }
                
                var unwatch = scope.$watch(
                   watchFnCtor($parse, scope, attr, ctrl),
                   function(tokens)
                   {
                      swValidationService.setValidationContextForName(
                            element, form, ctrl, name, tokens);
                   },
                   true
                );
                
                element.on('$destroy', function()
                {
                   unwatch();
                });
            }
         };
      }]);
    }

    _process('swValidate', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swValidate);
       return function()
       {
          return f(scope, {name: attr.name, value: ctrl.$modelValue});
       };
    });

    _process('swMaxlength', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swMaxlength);
       return function()
       {
          return {
             maxlength: {
                maxlength: parseInt(f(scope), 10),
                value: ctrl.$modelValue
             }
          };
       };
    });

    _process('swRequired', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swRequired);
       return function()
       {
          return {
             required: {
                active: f(scope),
                value: ctrl.$modelValue
             }
          };
       };
    });
          
    _process('swFuture', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swFuture);
       return function()
       {
          return {
             future: {
                active: f(scope),
                value: ctrl.$modelValue
             }
          };
       };
    });
                
    _process('swPast', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swPast);
       return function()
       {
          return {
             past: {
                active: f(scope),
                value: ctrl.$modelValue
             }
          };
       };
    });
    
    _process('swAllowedChars', function($parse, scope, attr, ctrl)
    {
       var f = $parse(attr.swAllowedChars);
       return function()
       {
          return {
             allowedChars: {
                allowedChars: f(scope),
                value: ctrl.$modelValue
             }
          };
       };
    });
    
    _process('swAlpha', function($parse, scope, attr, ctrl)
    {
       /*jshint unused:true */
       
       return function()
       {
          return {
             alpha: {
                value: ctrl.$modelValue
             }
          };
       };
    });
                
    _process('swNumeric', function($parse, scope, attr, ctrl)
    {
       /*jshint unused:true */
       
       return function()
       {
          return {
             numeric: {
                value: ctrl.$modelValue
             }
          };
       };
    });
                
    _process('swAlphaNumeric', function($parse, scope, attr, ctrl)
    {
       /*jshint unused:true */
       
       return function()
       {
          return {
             alphanumeric: {
                value: ctrl.$modelValue
             }
          };
       };
    });
                
    _process('swPattern', function($parse, scope, attr, ctrl)
    {
       /*jshint unused:true */
       
       var pattern = attr.swPattern;
       var message = attr.swPatternMessage;
       var format  = attr.swPatternFormat;
       var regex;
       
       var match = pattern.match(/^\/(.*)\/([gim]*)$/);
       if ( match )
       {
          regex = new RegExp(match[1], match[2]);
       }
       
       return function()
       {
          return {
             pattern: {
                pattern: regex || scope.$eval(pattern),
                message: message,
                format: format,
                value: ctrl.$modelValue
             }
          };
       };
    });
    
});
