define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['$q', 'swRestService',
         function ($q, swRestService) {

            this.export = function(id, format) {
               var deferred = $q.defer();
               //swRestService.restRequest
               //debugger;//service provider - NOT TESTED
               swRestService.restSwHttpRequest('get', 'Materials', 'export', {
                  id       : id,
                  format   : format
               })
                  .then(function onExportResponse(response) {
                     if (response.data && format === 'json') {
                        response.data = JSON.stringify(response.data, null, 2);
                     }
                     deferred.resolve(response.data);
                  }, function onExportReject(reason) {
                     deferred.reject(reason);
               });

               return deferred.promise;
            };

            this.import = function(id, format, data) {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('post', 'Materials', 'import', {
                  id     : id,
                  format : format,
                  data   : data
               });
            };

         }]
   });
});