(function (window) {
   'use strict';

   define(['swAppUrl'],
      function(swAppUrl) {
         var clipboardTrackerInterval = 2000;
         var prevText;

         var isChrome = function(){
            return window.navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
         };

         var isContainUrl = function(text){
            var pattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
            var isUrl = text.match(pattern);
            return isUrl;
         };

         var createSearchLink = function(text){
            var searchLink = swAppUrl.source;
            searchLink = searchLink.replace('admin', 'reader')
                                   .replace(/#\/[a-z0-9]*/gi, '');
            searchLink = searchLink + '?mode=search&text=' + encodeURIComponent(text);
            return searchLink;
         };

         return {
            isDataChanged : function () {
                  if (isChrome()) {
                     var isClipboardDataChanged = function () {
                        var clipboardClient;
                        if (typeof AllowClipboard !== 'undefined') {
                           /*jshint ignore:start*/
                           clipboardClient = new AllowClipboard.Client.ClipboardClient();
                           /*jshint ignore:end*/
                           clipboardClient.read(function (/*jshint ignore:start*/
                                                          success,
                                                          /*jshint ignore:end*/
                                                          clipboardText) {
                              if (typeof clipboardText !== 'undefined') {
                                 if (typeof prevText === 'undefined') {
                                    prevText = clipboardText;
                                 }
                                 if (clipboardText !== prevText && !isContainUrl(clipboardText)) {
                                    prevText = clipboardText;
                                    window.open(createSearchLink(clipboardText), '_blank');
                                 }
                              }
                           });
                        }
                     };
                     window.setInterval(isClipboardDataChanged, clipboardTrackerInterval);
               }
            }
         };
      });
}(this));