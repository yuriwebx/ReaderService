define([
   'module',
   'swComponentFactory',
   'text!./ContextShare.html',
   'less!./ContextShare.less'
], function(module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extend: '='
      },
      controller: [
         '$scope',
         'swPublicationsService',
         function (
             $scope,
             swPublicationsService
             ) {
            var vm = $scope,
                publicationId = vm.extend.publicationId || '';

            vm.sharingData = {};
            vm.viewConfig  = {
               visibleButtons: ['facebook']
            };

            (function configureShareData (id) {
               vm.sharingData = {
                  name             : vm.extend.publicationAuthor + ', ' + vm.extend.publicationName,
                  shortDescription : vm.extend.lookupString,
                  fullDescription  : vm.extend.lookupString,
                  picture          : getPicture(),
                  link             : vm.extend.link
               };

               function getPicture () {
                  return swPublicationsService.getCoverPath({id: id, cover: vm.extend.coverId}, 'small', '', true);
               }
            })(publicationId);
         }]
   });
});
