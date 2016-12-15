define([
   'module',
   'jquery',
   'underscore',
   'swServiceFactory',
   'publication/dom-utils/text-utils',
   'publication/locator',
   'text!./Report.html',
   'text!./ReportHeader.html',
   'text!./ReportFooter.html',
   'less!./Report.less'
], function (module, $, _, swServiceFactory, TextUtils, Locator, template, templateHeader, templateFooter) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopup',
         'swAgentService',
         function (swPopup, swAgentService) {

            function reportAboutMistake(info) {
               return swAgentService.request('post', 'Reports', {data : info});
            }
            var popup;
            var swReportService = this;
            this.showPopup = function (layout, bookInfo) {
               var popupScope = {
                  extend: {
                     text: '',
                     bookInfo: _.clone(bookInfo),
                     disableSendBtn: false,
                     send: function () {
                        var startLocator = _transformSelectionIntoLocator(popupScope.extend.bookInfo.selection.start);
                        var endLocator = _transformSelectionIntoLocator(popupScope.extend.bookInfo.selection.end);

                        popupScope.extend.disableSendBtn = true;
                        popupScope.extend.bookInfo.text = popupScope.extend.text;
                        popupScope.extend.bookInfo.paragraphsNumber = {
                           start: $('#' + startLocator.prefixedParagraphId).attr('data-id'),
                           end: $('#' + endLocator.prefixedParagraphId).attr('data-id')
                        };
                        popupScope.extend.bookInfo.locators = {
                           start: startLocator.toJSON(),
                           end: endLocator.toJSON()
                        };
                        var bookInfo = _.omit(popupScope.extend.bookInfo, ['selection']);
                        reportAboutMistake(bookInfo).then(function () {
                           swReportService.close();
                        });
                     },
                     close: function () {
                        swReportService.close();
                     }
                  }
               };

               popup = swPopup.show({
                  extendScope: popupScope,
                  header: templateHeader,
                  content: template,
                  footer: templateFooter,
                  layout: layout,
                  customClass: 'report-about-mistake defaultPopup'
               });

               popup.readyPromise.then(function () {
                  popup.layout();
               });

               return popup;
            };

            this.close = function () {
               if (popup && !popup.isHidden()) {
                  popup.hide(null);
               }
            };

            function _transformSelectionIntoLocator(selection) {
               var paragraphId = selection.id;
               var offset = selection.offset;
               var text = TextUtils.extractContent($('#' + paragraphId)[0]);
               var stableOffset = TextUtils.turnIntoStableOffset(offset, text);
               return new Locator.InTextLocator(paragraphId, stableOffset);
            }

         }]
   });
});