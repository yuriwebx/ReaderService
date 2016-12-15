define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$q', 'swRestService',
         function ($q, swRestService) {
            this.persistEssayTask = function (essayTaskData) {
               return request('post', 'ManageEssayTask', 'persistEssayTask', essayTaskData);
            };

            this.getEssayTask = function (essayTaskId) {
               return request('get', 'ManageEssayTask', 'getEssayTask', {id: essayTaskId});
            };

            this.removeEssayTask = function (essayTaskId) {
               return request('get', 'ManageEssayTask', 'removeEssayTask', {id: essayTaskId});
            };

            this.getEssayTasksList = function (publicationId) {
               var _requestData = {
                  'publicationId': publicationId
               };

               return request('get', 'ManageEssayTask', 'getEssayTasksList', _requestData);
            };

            function request(method, restPath, funcName, inData, params) {
               var deferred = $q.defer();

               swRestService.restRequest(method, restPath, funcName, inData, params)
                   .then(function (result) {
                      deferred.resolve(result.data);
                   }, function (reason) {
                      deferred.reject(reason);
                   });

               return deferred.promise;
            }
         }
      ]
   });
});