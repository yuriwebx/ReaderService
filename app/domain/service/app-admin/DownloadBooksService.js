define([
   'module',
   'swServiceFactory',
   'Context',
   'underscore'
], function (module, swServiceFactory, Context, _) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$http', '$q',
         function ($http, $q) {
            var epubsJsonFile = 'epubs.json';
            var serverUrl = Context.downloadUrl;
            var epubsJsonUrl = serverUrl + Context.parameters.EpubConfig.FilesPath;

            this.epubsUrl = epubsJsonUrl;

            this.searchBooks = function (filter, category) {
               return $http.get(epubsJsonUrl + epubsJsonFile)
                  .then(function (result) {
                     filter = filter.toLowerCase();
                     return _.filter(result.data, function (epub) {
                        return (epub.originalFileName + epub.author).toLowerCase().indexOf(filter) !== -1 && epub.category.indexOf(category) === 0;
                     });
                  })
                  .catch(function (err) {
                     return $q.reject(err);
                  });
            };

         }
      ]
   });
});