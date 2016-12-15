define([
   'module',
   'ngModule',
   'swLoggerFactory'
], function (module, ngModule, swLoggerFactory) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);

   logger.trace('create');

   ////////////////////////////////////////////////////////////////////////////

   var dirName = 'swFileReader';

   ngModule.directive(dirName, ['$parse', function ($parse) {

      logger.trace('register', dirName);

      return {

         restrict: 'A',

         scope: {
            startUpload: '&swFileReaderStart',
            finishUpload: '&swFileReaderFinish'
         },

         link: function (scope, element, attr)
         {
            var fn = $parse(attr[dirName]);

            if ( !element.is('input[type=file]') )
            {
               throw new Error('\'sw-input-file-reader\' directive is applicable to "input[type=file]" only');
            }

            element.on('change', function (event)
            {
               scope.startUpload();

               var file = event.target.files[0];

               if (file)
               {
                  scope.$apply(function () {

                     fn(scope.$parent, {
                        data: file
                     });
                  });

                  scope.finishUpload({
                     data: file
                  });
               }
               element.val('');
            });
         }
      };
   }]);
});
