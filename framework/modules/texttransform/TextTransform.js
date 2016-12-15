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
   
   ngModule.directive('swTextTransform', [function()
   {
      logger.trace('register');
      
      return {
         restrict: 'A',
         require: 'ngModel',
         compile: function (element)
         {
            if ( !element.is('input[type=text]') )
            {
               throw new Error('\'sw-text-transform\' directive is applicable to "input[type=text]" only');
            }
            
            return function(scope, element, attr, ctrl)
            {
               /*jshint unused:true */
               var textTransform = attr.swTextTransform || 'none';
               textTransform = textTransform.toLowerCase();
               switch ( textTransform )
               {
                  case 'uppercase':
                  case 'lowercase':
                  case 'capitalize':
                  case 'none':
                     break;
                  default:
                     throw new Error('"sw-text-transform": invalid attribute value: ' + textTransform);
               }
               
               ctrl.$parsers.push(function(value)
               {
                  return transform(value);
               });
               
               ctrl.$formatters.push(function(value)
               {
                  return transform(value);
               });
               
               function transform(text)
               {
                  // Skip transformation when placeholder is shown (field is empty).
                  // Otherwise placeholder is transformed.
                  element.css({textTransform: text ? textTransform : 'none'});
                  
                  if ( text )
                  {
                     switch ( textTransform )
                     {
                        case 'uppercase':  text = text.toUpperCase(); break;
                        case 'lowercase':  text = text.toLowerCase(); break;
                        case 'capitalize': text = capitalize(text);   break;
                     }
                  }
                  return text;
               }
               
               function capitalize(text)
               {
                  return _.map(text.split(/\s+/), function(word)
                  {
                     return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                  }).join(' ');
               }
               
            };
            
         }
      };
      
   }]);
});
