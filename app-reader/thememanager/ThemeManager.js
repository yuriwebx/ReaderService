define([
   'module',
   'swServiceFactory',
   'jquery'
], function(module, swServiceFactory, $) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {
         var bodyElement = $('body');
         var currentThemeName = '';
         
         this.activateTheme = function(setting)
         {
            var themeName = (setting || {}).value;
            if (themeName)
            {
               bodyElement.removeClass(currentThemeName);
               bodyElement.addClass(themeName);
            }
            else
            {
               bodyElement.removeClass(currentThemeName);
            }
            currentThemeName = themeName;
         };
         
      }]
   });
});