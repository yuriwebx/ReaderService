define(['module', 'swServiceFactory'], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : ['swEntityFactory', function(swEntityFactory) {
         var reources;
         
         this.initI18n = function(resources)
         {
            reources = swEntityFactory.create('LanguageResources', resources);
         };
         
         this.getResources = function()
         {
            return reources;
         };
      }]
   });
});