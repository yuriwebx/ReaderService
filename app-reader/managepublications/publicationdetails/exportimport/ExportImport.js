define([
   'module',
   'swComponentFactory',
   'text!./ExportImport.html',
   'text!./ExportImport-header.html',
   'text!./ExportImport-content.html',
   'less!./ExportImport.less'
], function (module, swComponentFactory, template, header, content) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template: template,
      isolatedScope: {
         publication : '=',
         config      : '='
      },
      controller : [
         '$scope',
         '$window',
         'swPopupService',
         'swExportImportService',
         'swOpenPublicationService',
         function ($scope, $window,  swPopupService, swExportImportService, swOpenPublicationService) {
            var _popup,
                _scope = {
                   invalidData: false,
                   format: 'json',
                   isAuthor: $scope.config.isAuthor
                };

            $scope.format = 'json';
            $scope.isEmptyJson = _scope.isEmptyJson = true;

            $scope.showPopup = function(event)
            {
               event.stopPropagation();
               //debugger;//service client - NOT TESTED
               swExportImportService.export($scope.publication.id, $scope.format)
                  .then(function onExport(data) {
                     if (data && Object.keys(JSON.parse(data)).length) {
                        _scope.data = data;
                        $scope.isEmptyJson = _scope.isEmptyJson = false;
                     }
                     if (!_popup || _popup.isHidden()) {
                        _popup = swPopupService.show({
                           extendScope: _scope,
                           header: header,
                           content: content,
                           backdropVisible: true,
                           modal: true,
                           customClass: 'export-import',
                           layout: {}
                        });
                     return _popup;
                  }
               });
            };

            _scope.hidePopup = function ()
            {
               _popup.hide(false);
            };

            _scope.selectAll = function ()
            {
               var target = $window.document.getElementById('export-import-area');
               target.selectionStart = 0;
               target.selectionEnd = target.value.length;
            };

            _scope.switchFormat = function (_format)
            {
               var self = this;
               if ($scope.format !== _format) {
                  self.format = $scope.format = _format;
                  if (self.data) {
                     //debugger;//service client - NOT TESTED
                     swExportImportService.export($scope.publication.id, $scope.format)
                     .then(function onSwitchFormat(data) {
                        self.data = data;
                     });
               }
               }
            };

            _scope.import = function(userData)
            {
               var self = this;
               if (userData.length) {
                  //debugger;//service client - NOT TESTED
                  swExportImportService.import($scope.publication.id, this.format, userData)
                     .then(function onImport(response) {
                        _popup.hide(false);
                        swOpenPublicationService.openPublication(response.data);
                     }, function onImportReject(/*err*/) {
                        self.invalidData = true;
                     });
               }
            };
         }]
   });
});