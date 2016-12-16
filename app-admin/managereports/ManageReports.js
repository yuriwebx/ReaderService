define([
   'swComponentFactory',
   'module',
   'jquery',
   'publication/locator',
   'publication/highlighter',
   'text!./ManageReports.html',
   'less!./ManageReports'

], function (swComponentFactory, module, $, Locator, Highlighter, template) {

   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      controller : [
         '$scope',
         '$element',
         '$timeout',
         '$sce',
         'swRestService',
         function ($scope,
                   $element,
                   $timeout,
                   $sce,
                   swRestService) {
            var vm = $scope;
            vm.itemsCount = 0;
            vm.itemsCountStep = 20;
            vm.total = 0;
            vm.swInit = _init;
            vm.more = more;

            vm.doFilter = function () {
               swRestService.restRequest('get', 'Reports', 'info', {count : vm.itemsCount}).then(
                  function (data) {
                     vm.reports = data.data || [];
                  }
               );
            };

            vm.getParagraphsNumber = function (report) {
               var str = '';
               var number = report.data.paragraphsNumber;
               if (number && number.start && number.end) {
                  if (number.start === number.end) {
                     str = number.start;
                  }
                  else {
                     str = number.start + ' - ' + number.end;
                  }
               }
               return str;
            };

            vm.openPublication = function(report){
               if (vm.activItem === report) {
                  vm.activItem = null;
                  return;
               }

               if(report){
                  var startLocator = Locator.deserialize(report.data.locators.start);
                  var endLocator = Locator.deserialize(report.data.locators.end);
                  var highlightText = function () {
                     $timeout(function () {
                        var rangeLocator = new Locator.InTextRangeLocator(startLocator, endLocator);
                        Highlighter.decorateInTextRangeLocator(rangeLocator, $element[0], 'selection');
                     });
                  };

                  if (report.html) {
                     vm.activItem = report;
                     highlightText();
                     return;
                  }

                  swRestService.restRequest('get', 'Reports', 'content', {
                     bookId: report.data.id,
                     start : startLocator.prefixedParagraphId,
                     end : endLocator.prefixedParagraphId
                  }).then(
                     function (res) {
                        var $html,
                            str = '';
                        res.data.forEach(function (item) {
                           str += item;
                        });
                        $html = $('<div>' + str + '</div>');
                        vm.activItem = report;
                        report.html = $sce.trustAsHtml($html.html());
                        highlightText();
                     }
                  );
               }
            };

            function _init() {
               vm.more();

            }

            function more() {
               vm.itemsCount += vm.itemsCountStep;
               vm.doFilter();
            }
         }
      ]
   });
});

