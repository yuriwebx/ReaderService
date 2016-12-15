define([
        
   'underscore',
   'module',
   'ngModule',
   'swLoggerFactory'
   
   ], function(
         
   _,
   module,
   ngModule,
   swLoggerFactory
   
   ){
   
   'use strict';
      
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   function register(dirName, render)
   {
      ngModule.directive(dirName, ['swI18nService', function(i18nService)
      {
         logger.trace('register', dirName);

         return {
            restrict: 'A',
            link: function(scope, element, attr)
            {
               var staticData = attr.swStaticData && scope.$eval(attr.swStaticData);

               if ( attr.swData )
               {
                  scope.$watch(attr.swData, function(data)
                  {
                     var context = data;
                     if ( staticData )
                     {
                        // merge data and staticData
                        // do not touch original data
                        context = _.defaults(_.clone(data) || {}, staticData);
                     }
                     render(scope, element, attr, i18nService, context);
                  },
                  true);
               }
               else
               {
                  render(scope, element, attr, i18nService, staticData);
               }
            }
         };
      }]);
   }
   
   register('swLocalize',     function(scope, element, attr, i18nService, context)
   {
      /*jshint unused:true */
      element.html(i18nService.getResource(attr.swLocalize, context));
   });
         
   register('swLocalizeAttr', function(scope, element, attr, i18nService, context)
   {
      var attributes = scope.$eval(attr.swLocalizeAttr);
      _.each(attributes, function(value, name)
      {
         element.attr(name, i18nService.getResource(value, context));
      });
   });
         
});
