define([
   'module',
   'swServiceFactory',
   'text!./CreateStudyProject-header.html',
   'text!./CreateStudyProject-footer.html'
], function (module, swServiceFactory, headerTemplate, footerTemplate) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         '$rootScope',
         function ( swPopupService, $rootScope ) {

            var createStudyProjectPopup,
                $scope;

            this.showCreateStudyProjectPopup = function (publication) {
               $scope = $rootScope.$new();

               $scope.headerfn = {
                  close   : hideCreateStudyProjectPopup
               };

               $scope.publication = publication;
               $scope.footer = {};

               if (!createStudyProjectPopup || createStudyProjectPopup.isHidden()) {
                  createStudyProjectPopup = swPopupService.show({
                     layout  : {},
                     backdropVisible: true,
                     modal: true,
                     customClass: 'create-study-project-template study-class-wizard scrollable', //TODO: remove scrollable after marge feature/baron
                     scope: $scope,
                     header  : headerTemplate,
                     content : '<sw-create-study-project headerfn="headerfn" publication="publication" footer="footer"></sw-create-study-project>',
                     footer: footerTemplate
                  });
               }
            };

            this.hideCreateStudyProjectPopup = function () {
               return createStudyProjectPopup && createStudyProjectPopup.hide();
            };

            function hideCreateStudyProjectPopup () {
               createStudyProjectPopup.hide();
            }
         }]
   });
});