define([
   'module',
   'swServiceFactory',
   'Context'
],
function (module, swServiceFactory, Context) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         function() {
            this.itemsPerPage = Context.parameters.itemsPerPage;
            this.libraryLanguages = [];
            this.publicationGroups = [];

         }
      ]
   });
});
