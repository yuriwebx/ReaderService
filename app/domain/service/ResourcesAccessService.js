define([
   'module',
   'swServiceFactory',
   'underscore',
   './Publications/FilesHandling',
   './Publications/DBWrapper',
   'ClientNodeContext',
   'ApplicationContext'
],
function (module, swServiceFactory, _, filesHandling, DBWrapper, ClientNodeContext, ApplicationContext) {
   'use strict';
   swServiceFactory.create({
      module : module,
      service : ['swLocalStorageService',
      function (swLocalStorageService) {
         /* --- api --- */

         // this.provideClientNodeId
         this.getServerUrl = getServerUrl;
         // this.getAbsoluteServerUrl
         this.getApplicationResourceUrl = getApplicationResourceUrl;
         this.setLocalStorageItem = setLocalStorageItem;
         this.getLocalStorageItem = getLocalStorageItem;
         this.removeLocalStorageItem = removeLocalStorageItem;
         this.getLocalRepositoryConnection = getLocalRepositoryConnection;
         this.getLocalFileSystemUrl = getLocalFileSystemUrl;
         this.getLocalFileSystemConnection = getLocalFileSystemConnection;

         this.clientNodeContext = ClientNodeContext;
         this.applicationContext = ApplicationContext;

         /* --- impl --- */

         function getServerUrl() {
            return ApplicationContext.serverUrl;
         }

         function getApplicationResourceUrl() {
            return ;
         }

         function getLocalStorageItem(key) {
            var storage = swLocalStorageService.get(key);
            return storage === null ? null : storage[key];
         }

         function setLocalStorageItem(key, value) {
            var storage = swLocalStorageService.get(key) || {};
            storage[key] = value;
            swLocalStorageService.set(key, storage);
         }

         function removeLocalStorageItem(key) {
            var storage = swLocalStorageService.get(key) || {};
            if (storage && _.has(storage, key)) {
               delete storage[key];
               swLocalStorageService.set(key, storage);
            }
         }

         function getLocalRepositoryConnection() {
            return DBWrapper;
         }

         function getLocalFileSystemConnection() {
            return filesHandling;
         }

         function getLocalFileSystemUrl(relativePath) {
            return ApplicationContext.localFileSystemUrl + '/' + relativePath;
         }
      }]
   });
});
