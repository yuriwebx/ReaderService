define([
   'Context',
   'underscore',
   'module',
   'swComponentFactory',
   'text!./ManagePublicationInfo.html',
   'less!./ManagePublicationInfo'
],
   function (
      Context,
      _,
      module,
      swComponentFactory,
      template
   ) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         config: '='
      },
      controller: [
         '$scope',
         'swPublicationsService',
      function (
         $scope,
         swPublicationsService) {
         var vm = $scope;
         var publicationTypes = Context.parameters.publicationConfig.publicationTypeEnum || {};
         vm.swInit    = _init;

         vm.isMainInfo = true;

         vm.publicationTypes   = {};
         vm.publication = {};

         vm.infoTabsMap = [
            {
               title      : 'Info',
               active     : true,
               activateFn : showMainInfo
            },
            {
               title      : 'Related',
               active     : false,
               activateFn : showAdditionalInfo
            }
         ];

         function _init () {
            getPublicationInfoByType(vm.config.publication)
                .then(function (_response) {
                   vm.publication = _response.data;
                   vm.publication.book.cover = _getCoverSrc(vm.publication.book);
                });
         }

         function showMainInfo (index) {
            vm.isMainInfo = true;
            setActive(index);
         }

         function showAdditionalInfo (index) {
            var type = vm.publication.type || vm.publication.book.publicationType;
            vm.isMainInfo = false;
            setMainInfoTemplateVisibility( type );
            setActive(index);
         }

         function setActive (i) {
            _.each(vm.infoTabsMap, function (_el, _i) {
               _el.active = i === _i;
            });
         }

         function setMainInfoTemplateVisibility (_publicationType) {
            for ( var _key in publicationTypes ) {
               if ( publicationTypes.hasOwnProperty(_key) ) {
                  vm.publicationTypes[_key] = ( _publicationType === publicationTypes[_key] );
               }
            }
         }

         function getPublicationInfoByType (_publication) {
            var type = _publication.type;
            if ( type === publicationTypes.book ) {
               return swPublicationsService.getBookInfo(_publication.id);
            }
            else if ( type === publicationTypes.studyGuide ) {
               return swPublicationsService.getBookInfo(_publication.id); //temp
            }
            else if ( type === publicationTypes.studyCourse ) {
               return swPublicationsService.getBookInfo(_publication.id); //temp
            }
            else if ( type === publicationTypes.collection ) {
               return swPublicationsService.getBookInfo(_publication.id); //temp
            }
         }

         function _getCoverSrc (book) {
            return swPublicationsService.getCoverPath(book, 'large', '#');
         }
      }]
   });
});
