define([
   'module',
   'swComponentFactory',
   'text!./DefaultBookNoteSelect.html',
   'less!./DefaultBookNoteSelect'
],
function (module, swComponentFactory, template) {
   'use strict';
   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         config: '='
      },
      controller: [
         'swPublicationsService',
         function (
            swPublicationsService,
            $scope) {
            var vm = $scope,
                bookId = vm.config.publicationId;

            vm.bookNotes = vm.config.relatedStudyGuides || [];

            vm.select = selectDefaultBookNote;

            function selectDefaultBookNote (bookNote) {
               swPublicationsService.persistDefaultStudyGuide(bookId, bookNote._id);
            }
         }]
   });
});
