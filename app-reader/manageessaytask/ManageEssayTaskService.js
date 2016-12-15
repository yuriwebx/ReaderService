define([
   'module',
   'swServiceFactory',
   'underscore',
   'text!./ManageEssayTask-header.html'
], function (module, swServiceFactory, _, header) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         '$rootScope',
          function (swPopupService, $rootScope) {
            var popup,
                _paragraphId,
                _publicationId,
                _essayTaskData,
                $scope = $rootScope.$new();

            this.showEssayEditor = function (paragraphId, publicationId, essayTaskData) {
               _paragraphId = paragraphId;
               _publicationId = publicationId;
               _essayTaskData = (essayTaskData) ? _.clone(essayTaskData) : null;

               if (!popup || popup.isHidden()) {
                  $scope.headerfn = {
                     closePopup: function(){},
                     persistEssayTask: function(){}
                  };
                  popup = swPopupService.show({
                     layout: {},
                     backdropVisible: true,
                     modal: true,
                     customClass: 'manage-essay-task-popup',
                     scope: $scope,
                     header: header,
                     content: '<sw-manage-essay-task headerfn="headerfn"></sw-manage-essay-task>'
                  });
                  return popup;
               }
            };

            this.close = function (data) {
               popup.hide(data || false);
            };

            this.getParagraphId = function () {
               return _paragraphId;
            };

            this.getPublicationId = function () {
               return _publicationId;
            };

            this.getEssayTaskData = function() {
               return _essayTaskData;
            };
         }]
   });
});