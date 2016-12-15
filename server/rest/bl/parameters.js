/*jslint node: true */
(function () {
   'use strict';
   var publications = require('../publication');

   function fetchParams(context) {
      return publications.getLibraryParameters().then(returnParams);

      function returnParams(params) {
         if ((context && context.applicationContext && context.applicationContext.application || '').toLowerCase() === 'searcher') {
            params.libraryLanguages = ['en', 'ar', 'fa'];
         }
         return {
            LibraryParameters : params
         };
      }
   }

   module.exports = {
      fetch : fetchParams
   };
})();
