define([
   'module',
   'jquery',
   'underscore',
   'swComponentFactory',
   'text!./StudyContent.html',
   'less!./StudyContent'
], function (
   module,
   /* jshint ignore:start */
   $,
   /* jshint ignore:end */
   _,
   swComponentFactory,
   template
   ) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extrasApi: '=',
         switchCollectionItem: '&'
      },
      controller: [
         '$scope',
         '$q',
         'swReaderService',
         'swBookInfoService',
         'swOpenPublicationService',
         'swPublicationsService',
         'swDirectVocabularyService',
         'swVocabularyAssessmentService',
         'swStudyPublicationService',
         'swScrollFactory',
         '$element',
         '$timeout',
         function (
            $scope,
            $q,
            swReaderService,
            swBookInfoService,
            swOpenPublicationService,
            swPublicationsService,
            swDirectVocabularyService,
            swVocabularyAssessmentService,
            swStudyPublicationService,
            swScrollFactory,
            $element,
            $timeout) {
            var vm = $scope;
            var bookKey = swReaderService.getBookKey();
            var currentOpenedPublicationIndex = -1;

            vm.swInit                    = _init;
            vm.switchItem                = switchItem;
            vm.isOpenedPublication       = isOpenedPublication;
            vm.getCoverSrc               = getCoverSrc;
            vm.isPublication             = isPublication;
            vm.isSection                 = isSection;
            vm.isVocabularyAssessment    = isVocabularyAssessment;
            vm.startVocabularyAssessment = startVocabularyAssessment;
            vm.showDifficulty            = swPublicationsService.showDifficulty;

            function _init () {
               var isCollection = !!vm.extrasApi.collectionId;
               var promise =
                  isCollection ? swPublicationsService.searchCollectionItems(vm.extrasApi.collectionId)
                     : $q.when(swStudyPublicationService.getStudyItems());

               promise.then(function (items) {
                  vm.studyContentItems = items;
                  if ( isCollection ) {
                     currentOpenedPublicationIndex = _.findIndex(items, {id: bookKey._id});
                  }
                  else { //study course
                     currentOpenedPublicationIndex = swStudyPublicationService.getCurrentItemIndex();
                  }

                  $timeout(function () {
                     var $currentEl = $element.find('.study-content-list li').eq(currentOpenedPublicationIndex);
                     if ( $currentEl.length ) {
                        scrollIntoView($currentEl);
                     }
                  });
               });

               swBookInfoService.saveBookInfo(bookKey, {
                  extrasTab: 'StudyContent'
               });
            }

            function switchItem (index) {
               var item = vm.studyContentItems[index] || {};
               var options = {reload: true};

               if ( !vm.isOpenedPublication(index) ) {
                  if ( !vm.extrasApi.collectionId ) { // then study course
                     swStudyPublicationService.switchItem(item.id)
                        .then(function (item) {
                           var locator = _.get(item, 'readingPosition.fragmentId', '');
                           _.extend(options, {
                              reload          : false,
                              readRange       : item.readRange,
                              studyItemId     : item.studyItemId,
                              readingPosition : item.readingPosition
                           });
                           currentOpenedPublicationIndex = index;
                           swOpenPublicationService.openPublication(item.id, locator, options);
                        });
                  }
                  else {
                     swOpenPublicationService.openPublication(item.id, item.readingPosition, options);
                     vm.switchCollectionItem();
                  }
               }
            }

            function isOpenedPublication (index) {
               return index === currentOpenedPublicationIndex;
            }

            function getCoverSrc (item) {
               return swPublicationsService.getCoverPath(item, 'small', '#');
            }

            function isPublication (item) {
               return item.type && (item.type === 'Book' || item.type === 'StudyGuide');
            }

            function isSection (item) {
               return item.type && item.type === 'section item';
            }

            function isVocabularyAssessment (item) {
               return item.type && item.type === 'vocabulary assessment item';
            }

            function startVocabularyAssessment () {
               swVocabularyAssessmentService.startAssessment(swDirectVocabularyService, {wait: true});
            }

            function scrollIntoView ($element) {
               var scroll = swScrollFactory.getParentScroll($element);
               if ( scroll ) {
                  scroll.scrollIntoViewIfNeeded($element);
               }
            }
         }
      ]
   });
});
