define([
   'module',
   'Context',
   'swComponentFactory',
   'text!./GetSystemAboutInfoContent.html',
], function (module, Context, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      controller : ['$scope', '$timeout', 'swApplicationToolbarService', 'swI18nService', 'swDownloadManager' ,
         function ($scope, $timeout, swApplicationToolbarService, swI18nService, swDownloadManager) {

            var systemInfo = [];
            $scope.brand = 'Brand';

            var configInfo = Context.parameters;
            var sdCardInfo = swDownloadManager.getSDCardInfo();
            if (configInfo) {
               if (configInfo.buildVersion) {
                  systemInfo.push(['Version',  configInfo.buildVersion]);
               }
               if (configInfo.brand) {
                  $scope.brand = configInfo.brand;
               }
            }
            $timeout(function(){$scope.configInfo = configInfo;});

            $scope.systemInfo = systemInfo;
            $scope.year = '2015';
            $scope.booksCount = sdCardInfo[0];
            $scope.audioBooksCount = sdCardInfo[1];
            $scope.getAppName = function () {
               var key = swApplicationToolbarService.isEditor() === 'true' ?
                  'App.GetSystemAboutInfo.editorAppName.label' :
                  'App.GetSystemAboutInfo.appName.label';
               return swI18nService.getResource(key);
            };
            $scope.libraryLink = swI18nService.getResource("App.GetSystemAboutInfo.link.text");

         }]
   });
});