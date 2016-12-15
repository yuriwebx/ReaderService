/* global window */
define([
   '../../service/Publications/FilesHandling'
],
function (filesHandling) {
   'use strict';

   var context = {};
   /* --- api --- */
   context.application = '';
   context.serverUrl = '';
   context.applicationUrl = '';
   context.applicationResourceUrl = window.location.origin + window.location.pathname;
   context.systemLevelNamespace = '';
   context.applicationLevelNamespace = '';
   context.localRepositoryAvailable = false;
   context.localRepositoryType = '';
   context.localFileSystemAvailable = filesHandling.isFSAvailable();
   context.localFileSystemUrl = filesHandling.getLocalPath();

   return context;

   /* --- impl --- */

});
