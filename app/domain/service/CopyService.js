define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
            '$window',
            function ($window) {

            //copy for all browsers and devices, except Safari
            this.copyText = function (text) {
               if ($window.cordova){
                  $window.cordova.plugins.clipboard.copy(text);
               }
               else {
                  if ($window.clipboardData) {//for IE
                     $window.clipboardData.setData('text', text);
                  }
                  else {
                     var input = $window.document.createElement('textarea');
                     $window.document.body.appendChild(input);
                     input.value = text;
                     input.select();
                     $window.document.execCommand('Copy');
                     input.remove();
                  }
               }
            };

            //ctrl+c listener
            this.copyListener = function (e, copyTextObj) {
               if ($window.clipboardData) { //IE
                  $window.clipboardData.setData('text', copyTextObj.plain);
               }
               else {
                  e.clipboardData.setData('text/plain', copyTextObj.plain);
                  e.clipboardData.setData('text/html', copyTextObj.html);
               }
               e.preventDefault();
               $window.document.removeEventListener('copy',this.copyListener);
            };

            this.getTextForCopy = function (selectionHighlights, link, author, bookName, paragraph, isAuthorInTitle) {
               var copyTextObj = {
                  "plain": '',
                  "html": ''
               };
               if(selectionHighlights) {
                  copyTextObj = getSelectedText(selectionHighlights, copyTextObj);
               }
               var linkText = this.getPlainText(author, bookName, paragraph, isAuthorInTitle);
               copyTextObj.html = copyTextObj.html + "<br><br>" + getHtmlText(link, linkText);
               copyTextObj.plain = copyTextObj.plain + "\r\n\r\n" + linkText;

               return copyTextObj;
            };

            var getHtmlText = function(link, text){
               var formattedLink = '<a href="' + link + '">' + text + '<\/a>';
               return formattedLink;
            };

            this.getPlainText = function(author, bookName, paragraph, isAuthorInTitle){
               author =  isAuthorInTitle ? '' : author + ', ';
               var text = author + '“' + bookName + '” ' + (paragraph ? paragraph : '');
               return text;
            };

            var getSelectedText = function(selectionHighlights, copyTextObj) {
               var text = '',
                  forceLineBreak;

               for(var i = 0; i <  selectionHighlights.length; i++) {
                     text = selectionHighlights.eq(i).text();
                     text = text.replace(/\n+/g, ' ');
                     forceLineBreak = i !== 0 && selectionHighlights.eq(i).closest('[data-before]')[0] !== selectionHighlights.eq(i - 1).closest('[data-before]')[0];

                     copyTextObj.plain += (forceLineBreak ? "\r\n\r\n" : "") + text;
                     copyTextObj.html += (forceLineBreak ? "<br><br>" : "") + text;
               }
               return copyTextObj;
            };
         }
      ]
   });
});