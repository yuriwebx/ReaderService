define([
   'module',
   'swServiceFactory',
   'underscore',
   'text!./ManageTest-header.html',
], function (module, swServiceFactory, _, header) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swPublicationsService',
         'swStudyFlashcardsService',
         '$rootScope',
         '$window',
         function (swPopupService, swPublicationsService, swStudyFlashcardsService, $rootScope, $window) {
            var popup,
                _testInData,
                _publicationId,
                $scope = $rootScope.$new();

            this.showTestEditor = function (testInData, publicationId) {
               _testInData = _.clone(testInData);
               _publicationId = publicationId;

               if (!popup || popup.isHidden()) {
                  $scope.headerfn = {
                     closePopup: function(){},
                     exportTest: function(){},
                     isDisabledExport : function(){},
                     persistTest: function(){},
                     onImportBackClick: function(){},
                     searchTests: function(){},
                     startJSONImport: function(){},
                     startQuizletImport: function(){},
                     layout: function(){
                        popup.layout();
                     }
                  };
                  $scope.popupsettings = {
                     name: '',
                     testSearchCriteria: '',
                     isOtherSourceImport: '',
                     isTestExport: '',
                     form: {},
                     disabled: false
                  };
                  var element = $window.document.getElementById('readertoolbar');

                  popup = swPopupService.show({
                     layout: {
                        of: element,
                        margin: {
                           top: 60
                        }
                     },
                     backdropVisible: true,
                     modal: true,
                     customClass: 'manage-test-popup',
                     scope: $scope,
                     header: header,
                     content: '<sw-manage-test headerfn="headerfn" popupsettings="popupsettings"></sw-manage-test>'
                  });
                  return popup;
               }
            };

            this.close = function (data) {
               popup.hide(data || false);
            };

            this.getTestInData = function () {
               return _testInData;
            };

            this.getPublicationId = function () {
               return _publicationId;
            };

            this.searchFlashcards = function (criteria) {
               //debugger;//service client - result is not used
               return swStudyFlashcardsService.searchTests(criteria);
            };

            this.getPublicationCover = function (book) {
               return swPublicationsService.getCoverPath(book, 'large');
               //TODO antm: check this code!
            };

            this.getRandomIndexes = function(correctIndex, totalLen, resultsCount) {
               var randomIndexes = [];
               var isLenEnough = totalLen - 1  > resultsCount;
               var randomIndex;

               while (totalLen > 1 && randomIndexes.length !== resultsCount) {
                  randomIndex = Math.floor(Math.random() * (totalLen));
                  if (randomIndex !== correctIndex) {
                     if (isLenEnough) {
                        if (randomIndexes.indexOf(randomIndex) < 0) {
                           randomIndexes.push(randomIndex);
                        }
                     }
                     else {
                        randomIndexes.push(randomIndex);
                     }
                  }
               }
               return randomIndexes;
            };
         }]
   });
});