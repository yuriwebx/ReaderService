define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$q', 'swRestService', 'swAgentService',
         function ($q, swRestService, swAgentService) {

            this.persistTest = function (testData) {
               return request('post', 'ManageTests', 'persistTest', testData);
            };

            this.getTest = function (testId, publicationId) {
               var testData = {
                  id: testId,
                  publicationId: publicationId
               };

               return request('get', 'ManageTests', 'getTest', testData);
            };

            //getTestsList() returns a list of tests without testQuestions
            this.getTestsList = function (publicationId) {
               var _requestData = {
                  'publicationId': publicationId
               };

               return request('get', 'ManageTests', 'getTestsList', _requestData);
            };

            //no clients
            this.removeTests = function (testId) {
               var _requestData = {
                  'id': testId
               };

               return request('post', 'ManageTests', 'removeTests', _requestData);
            };

            //TODO: not in requirements
            this.uploadAttachment = function (blob) {
               var _params = {
                  'fileType' : blob.type
               };

               return request('post', 'ManageTests', 'uploadAttachment', blob, _params);
            };

            this.getTestFileSource = function(fileId) {
               var url = swRestService.getUrlString('ManageTests', 'getFile').split('?RunId=')[0];
               url += '?fileId=' + fileId;
               return url;
            };

            this.searchTests = function(criteria) {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('get', 'ManageTests', 'searchTests', {
                  criteria : criteria
               });
            };

            function request(method, restPath, funcName, inData, params) {
               var deferred = $q.defer();
               //swRestService.restRequest
               //debugger;//service provider - tested
               swAgentService.request(method, restPath, funcName, inData, params)
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