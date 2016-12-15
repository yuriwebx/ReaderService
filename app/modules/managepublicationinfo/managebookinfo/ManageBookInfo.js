// Depend on parent component and user role you can select default or current Study Guide.
// If you need that, use isolatedScope params as below:
// viewConfig = {
//    currentSelect : Boolean,
//    defaultSelect : Boolean,
//    selectedId    : 'id',
//    persist       : Boolean
// }
// If you will not set any param 'defaultSelect = true' will be set as default

define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./ManageBookInfo.html',
   'less!./ManageBookInfo'
],
function (module, _, swComponentFactory, template ) {
   'use strict';
   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         publication : '=',
         viewConfig  : '='
      },
      controller: [
         '$scope',
         'swPublicationsService',
         'swManageBookInfoService',
         function ( $scope, swPublicationsService, swManageBookInfoService) {
            var vm                  = $scope;
            var isPersisting        = false;
            var defaultStudyGuideId = vm.publication.defaultStudyGuideId;

            vm.swInit     = _init;
            vm.select     = selectStudyGuide;
            vm.isDisabled = isDisabled;
            vm.isDefault  = isDefault;

            vm.viewConfig = vm.viewConfig || {
               persist : true
            };
            vm.checked    = {
               index : -1
            };

            function _init () {
               _setBookViewInfo(vm.publication);
            }

            function _setBookViewInfo (_bookInfo) {
               var baseCategory = _bookInfo.book && _bookInfo.book.category;
               _setChecked(_getActiveIndex(_bookInfo));
               _.each(_bookInfo.relatedStudyGuides, function (_sg) {
                  _sg.readingTime  = _countReadingTime(_sg);
                  _sg.cover        = _getCoverSrc(_sg);
                  _sg.baseCategory = baseCategory;
               });
            }

            function selectStudyGuide (_id, _i) {
               if ( isPersisting ) {
                  return false;
               }
               _setChecked(_i);
               _id = vm.checked.index === -1 ? vm.publication.book.id : _id;
               vm.viewConfig.selectedId = _id;
               isPersisting = true;

               if ( !vm.viewConfig.persist ) {
                  isPersisting = false;
                  return false;
               }

               var persistFn = vm.viewConfig.currentSelect ? persistCurrent(_id) : persistDefault(_id);
               persistFn.then(function () {
                  swManageBookInfoService.setStudyGuide({id: _id});
                  isPersisting = false;
               });
            }

            function persistDefault (_id) {
               return swPublicationsService.persistDefaultStudyGuide(vm.publication.book.id, _id)
                  .then(function () {
                     defaultStudyGuideId = _id;
                  });
            }

            function persistCurrent (_id) {
               return swPublicationsService.persistCurrentStudyGuide(vm.publication.book.id, _id);
            }

            function isDisabled () {
               return vm.viewConfig.disableAll;
            }

            function isDefault (_studyGuide) {
               return defaultStudyGuideId === _studyGuide.id;
            }

            function _countReadingTime (_item) {
               return _item.readingTime;
            }

            function _getCoverSrc (_item) {
               return _item.cover && _item.cover.indexOf('/') > 0 ?
                  _item.cover :
                  swPublicationsService.getCoverPath({id:_item.cover.slice(10), cover: _item.cover}, 'small', '#');
            }

            function _setChecked (_i) {
               vm.checked.index = vm.checked.index === _i ? -1 : _i;
            }

            function _getActiveIndex (_bookInfo) {
               var defaultId = _bookInfo.currentStudyGuideId || vm.viewConfig.selectedId;
               return vm.viewConfig.currentSelect ?
                      _.findIndex(_bookInfo.relatedStudyGuides, {id: defaultId}) :
                      _.findIndex(_bookInfo.relatedStudyGuides, {id: _bookInfo.defaultStudyGuideId});
            }
         }]
   });
});
