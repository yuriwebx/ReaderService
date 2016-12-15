define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swDictionaryService',
         '$rootScope',
         function (swPopupService, swDictionaryService, $rootScope) {
            var lookup,
                usedForSearch;

            function wordProcessing(str) {
               str = str.replace(/[.,:;?!(\)\”\“\‘\’[\]<{}\>-]+/, '');
               str = str.replace(/\s{2,}/, '');
               str = str.trim();
               return str;
            }

            function getDefinition(terms, callback) {
               var digitsTest = /\d/;
               var empty = {};
               if (!digitsTest.test(terms[0][0]) && terms[0].length) {
                  swDictionaryService.initDictionary('en');
                  //debugger;//service client - tested
                  swDictionaryService.getDictionaryDefinition(terms[0].toUpperCase()).then(function (data) {
                     if (data.count !== 0) { //find
                        data.usedForSearch = usedForSearch;
                        callback(data);
                     }
                     else if (terms.length !== 1) { // find else
                        terms.shift();
                        getDefinition(terms, callback);
                     }
                     else {
                        empty.term = terms[0];
                        empty.usedForSearch = usedForSearch;
                        callback(empty);
                     }
                  });
               }
               else {
                  if (terms.length !== 1) {
                     terms.shift();
                     getDefinition(terms, callback);
                  }
                  else {
                     empty.term = terms[0];
                     empty.usedForSearch = usedForSearch;
                     callback(empty);
                  }
               }
            }

            function toggleLookup(data, layout, extend) {
               var $scope = $rootScope.$new();
               if (!lookup || lookup.isHidden()) {
                  $scope.data = data;
                  lookup = swPopupService.show({
                     layout: layout || {},
                     customClass: 'lookup-popup',
                     scope: $scope,
                     content: '<sw-lookup data="data"></sw-lookup>',
                     backdropVisible: true
                  });

                  extend.updateLayout = lookup.layout;

                  lookup.promise.then(function () {
                     extend.popupClose();
                  });
               }
            }

            this.showLookupPopup = function (term, layout, extend) {
               var terms;

               usedForSearch = term;
               term = wordProcessing(term);
               terms = term.split(' ').splice(0, 2);

               getDefinition(terms, function (response) {
                  toggleLookup(response, layout, extend);
               });
            };
         }]
   });
});