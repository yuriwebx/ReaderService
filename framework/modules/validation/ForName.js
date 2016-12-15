/**
 * Directives intended for validation state visualization.
 *
 * Note that swValidationService.setValidationMessagesEnabled()
 * controls the behavior of these directives.
 *
 * <ANY sw-label-for-name="expr">
 *    Label linked to input with specified name.
 *    Class 'sw-validation-label' is set automatically.
 *
 * <ANY sw-error-for-name="expr">
 *    Error linked to input with specified name.
 *    Class 'sw-validation-error' is set automatically.
 *
 * To be consistent with Angular validation, the same classes are used
 * for validity visualization:
 *    'ng-valid'
 *    'ng-invalid'
 *
 * For constraint 'activity' visualization, class 'sw-validation-<constraint>' is
 * toggled reflecting 'active' constraint context property 'active' state
 *
 * See ValidationService.js
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

   function _process(dirName, className, insertMessages)
   {
      ngModule.directive(dirName, ['swValidationService', function(swValidationService)
      {
         logger.trace('register', dirName);
      
         return {
            restrict: 'A',
            link: function(scope, element, attr)
            {
               element.addClass(className);
               
               var form = element.controller('form');
               var name = scope.$eval(attr[dirName]);
               
               if ( !form )
               {
                  throw new Error('"ng-form" attribute must be specified');
               }
               
               var _valid = true; // current validity state
               element.addClass('ng-valid');
               
               scope.$watch(
                  function()
                  {
                     return [swValidationService.isValidationMessagesEnabled(form),
                             swValidationService.getAngularErrorsForName(form, name),
                             swValidationService.getValidationContextForName(form, name)];
                  },
                  function(a)
                  {
                     var swValidationMessagesEnabled = a[0];
                     var ngErrorsForName             = a[1];
                     var swValidationContextForName  = a[2];
                     
                     _.each(swValidationContextForName, function(context, token)
                     {
                        swValidationService.monitorTokenActivity(element, token, context);
                     });

                     var invalidTokens = [];
                     if ( swValidationMessagesEnabled )
                     {
                        _.each(ngErrorsForName, function(invalid, token)
                        {
                           if ( invalid )
                           {
                              invalidTokens.push(token);
                           }
                        });
                     }

                     if ( insertMessages )
                     {
                        var messages = _.map(invalidTokens, function(token)
                        {
                           return swValidationService.composeMessageForToken(
                                     swValidationContextForName, token);
                        });
                        element.html(messages.join(', '));
                     }

                     var valid = _.isEmpty(invalidTokens);
                     if ( _valid !== valid )
                     {
                        _valid = valid;
                        element.toggleClass('ng-valid');
                        element.toggleClass('ng-invalid');
                        // These classes are set on inputs by ngModel.$setValidity().
                        // We use the same ones for consistency.
                     }
                        
                  },
                  true
               ); // watch
            } // link
         }; // return
      }]); // directive
   } // _process

   _process('swLabelForName', 'sw-validation-label', false);
   _process('swErrorForName', 'sw-validation-error', true);
   
});
