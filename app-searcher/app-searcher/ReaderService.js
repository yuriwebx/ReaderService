/*jslint camelcase: false */
define([
   'module',
   'jquery',
   'swServiceFactory'
], function(module, $, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {
         var bookKey = {},
             packageDocument,
             metadata,
             nextPublicationOpenFn,
             isNextPublication;

         this.getBookName = function()
         {
            return metadata && metadata.title;
         };
         
         this.getAuthor = function()
         {
            return metadata && metadata.author;
         };
         
         this.getCoverUrl = function()
         {
            return packageDocument && metadata && packageDocument.getSharedJsPackageData().rootUrl + '/' + metadata.cover_href;
         };

         this.setBookKey = function(_bookKey)
         {
            $.extend(bookKey, _bookKey);
         };

         this.openPublicationNext = function ()
         {
            nextPublicationOpenFn(bookKey._id);
         };

         this.setOpenPublicationNextFn = function (fn)
         {
            nextPublicationOpenFn = fn;
         };

         this.checkPublicationNext = function ()
         {
            if (typeof isNextPublication === 'function')
            {
               return isNextPublication(bookKey._id);
            }
         };

         this.setCheckPublicationNextFn = function (fn)
         {
            isNextPublication = fn;
         };

         this.getBookKey = function()
         {
            return bookKey;
         };
         
         this.setPackageDocument = function(_packageDocument)
         {
            packageDocument = _packageDocument;
         };
         
         this.getPackageDocument = function()
         {
            return packageDocument;
         };
         
         this.setMetadata = function(_metadata)
         {
            metadata = _metadata;
         };
      }]
   });
});