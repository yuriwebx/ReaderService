define([
   'module',
   'swServiceFactory',
   'text!./BeginNewCourse-header.html',

   'text!./BeginNewCourse-footer.html'
], function(module, swServiceFactory, headerTemplate, footerTemplate) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
      'swPopupService',
      '$rootScope',
      function (swPopupService, $rootScope) {
         var $scope = $rootScope.$new(),
             beginNewCoursePopup;

         this.showPopup = function (publicationData) {
            $scope = $rootScope.$new();

            $scope.headerfn = {
               close : this.hidePopup
            };

            $scope.publicationData = publicationData;

            if (!beginNewCoursePopup || beginNewCoursePopup.isHidden()) {
               beginNewCoursePopup = swPopupService.show({
                  layout  : {},
                  backdropVisible: true,
                  modal: true,
                  customClass: 'begin-new-course-popup scrollable',
                  scope: $scope,
                  header: headerTemplate,
                  content : '<sw-begin-new-course headerfn="headerfn" publication-data="publicationData"></sw-begin-new-course>',
                  footer:footerTemplate
               });
            }
         };

         this.hidePopup = function () {
            return beginNewCoursePopup && beginNewCoursePopup.hide();
         };
         
      }]
   });
});
