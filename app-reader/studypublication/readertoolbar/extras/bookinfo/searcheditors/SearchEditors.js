define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./SearchEditors.html',
   'less!./SearchEditors'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extrasApi: '='
      },
      controller: [
         '$q',
         '$scope',
         '$element',
         'swReaderService',
         'swScrollFactory',
         'swLazyLoadingHelper',
         'swManageStudyGuideEditorsService',
         'swUserService',
         function (
            $q,
            $scope,
            $element,
            swReaderService,
            swScrollFactory,
            swLazyLoadingHelper,
            swManageStudyGuideEditorsService,
            swUserService
         ) {
            var vm               = $scope,
                studyGuideId     = getStudyGuideId(),
                scroll,
                editorsCount     = 0,
                editorsCountStep = 5;

            vm.extrasApi.editors    = vm.extrasApi.editors || [];
            vm.editorsForStudyGuide = [];
            vm.editorsFilter        = '';
            vm.debounce             = vm.debounce || 500;

            vm.swInit      = _init;
            vm.resetSearch = resetSearch;
            vm.addEditor   = addEditor;

            function _init () {
               _.defer(function () {
                  scroll = swScrollFactory.getParentScroll($element.find('.editors-list'));
                  searchEditors();
               });
            }

            vm.searchEditors = _.debounce(function () {
               searchEditors(studyGuideId, vm.editorsFilter, editorsCount);
            }, vm.debounce);

            function resetSearch () {
               vm.editorsFilter = '';
               editorsCount = 0;
               searchEditors(studyGuideId, vm.editorsFilter, editorsCount);
            }

            function addEditor (editor, index) {
               vm.extrasApi.editors.push(editor);
               vm.editorsForStudyGuide[index].alreadyInvited = true;
            }

            function loadEditors () {
               editorsCount += editorsCountStep;
               return swManageStudyGuideEditorsService.searchEditorsForStudyGuide(studyGuideId, vm.editorsFilter, editorsCount).then(loadMore);

               function loadMore (response) {
                  vm.editorsForStudyGuide = response.data;
                  vm.editorsForStudyGuide = _.map(vm.editorsForStudyGuide, addPhotoLink);
                  if (editorsCount >= vm.editorsForStudyGuide.length) {
                     return $q.reject();
                  }
                  return $q.when(true);
               }
            }

            function addPhotoLink(editor) {
               if (editor.user && editor.user.photo) {
                  editor.user.isPhoto = true;
                  editor.user.photoLink = swUserService.getUserPhoto(editor.user.photo);
               }
               return editor;
            }

            function searchEditors () {
               if(scroll) { //TODO: remove after add opportunity open many popups
                  swLazyLoadingHelper.unregister(scroll);
                  swLazyLoadingHelper.register(scroll, {
                     next: loadEditors,
                     rift: 25
                  });
               }
            }

            function getStudyGuideId () {
               var bookKey = swReaderService.getBookKey();
               return bookKey && bookKey._id;
            }
         }
      ]
   });
});