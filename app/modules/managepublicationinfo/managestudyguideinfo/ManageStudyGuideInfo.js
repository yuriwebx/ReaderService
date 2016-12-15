define([
       'module',
       'moment',
       'underscore',
       'swComponentFactory',
       'text!./ManageStudyGuideInfo.html',
       'less!./ManageStudyGuideInfo'
    ],
    function ( module, moment, _, swComponentFactory, template ) {
       'use strict';
       swComponentFactory.create({
          module: module,
          template: template,
          isolatedScope: {
             publication: '='
          },
          controller: [
             '$scope',
             'swPublicationsService',
             function ( $scope, swPublicationsService ) {
                var vm            = $scope;
                var isPersisting  = false;

                vm.checked = {
                   index : -1
                };

                vm.swInit = _init;
                vm.setDefault = setDefaultStudyGuide;
                vm.isDisabled = isDisabled;

                function _init () {
                   _setBookViewInfo(vm.publication);
                }

                function _setBookViewInfo (_bookInfo) {
                   _.each(_bookInfo.relatedStudyGuides, function (_sg, _i) {
                      _sg.readingTime = _countReadingTime(_sg);
                      _sg.cover       = _getCoverSrc(_sg);

                      if ( _sg.id === _bookInfo.defaultStudyGuideId ) {
                         _setChecked (_i);
                      }
                   });
                }

                function setDefaultStudyGuide (_id, _i) {
                   if ( isPersisting ) {
                      return false;
                   }
                   isPersisting = true;
                   _setChecked(_i);
                   _id = vm.checked.index === -1 ? '' : _id;
                   swPublicationsService.persistDefaultStudyGuide(vm.publication.book.id, _id)
                       .then(function () {
                          isPersisting = false;
                       });
                }

                function isDisabled (_i) {
                   return vm.checked.index !== _i && vm.checked.index !== -1;
                }

                function _countReadingTime (_item) {
                   return moment(_item.wordsNumber / 140).format('HH:MM');
                }

                function _getCoverSrc (_item) {
                   return _item.cover && _item.cover.indexOf('/') > 0 ?
                      _item.cover :
                      swPublicationsService.getCoverPath({id:_item.cover.slice(10), cover: _item.cover}, 'small', '#');
                }

                function _setChecked (_i) {
                   vm.checked.index = vm.checked.index === _i ? -1 : _i;
                }
             }]
       });
    });
