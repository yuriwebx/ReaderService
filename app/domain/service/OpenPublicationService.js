define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [function () {
         var listeners = [],
            openStudyCourseFn;

         this.addOpenPublicationListener = function(_listener) {
            listeners.push(_listener);
         };

         this.removeOpenPublicationListener = function(listener) {
            for (var i = 0; i < listeners.length; ++i) {
               if (listeners[i] === listener) {
                  listeners.splice(i, 1);
                  break;
               }
            }
         };

         this.openPublication = function(id, locator, options, isToBeStudied) {
            for (var i = 0; i < listeners.length; ++i) {
               listeners[i](id, locator, options, isToBeStudied);
            }
         };

         this.beginUserStudy = function(id, locator, options)
         {
            openStudyCourseFn(id, locator, options);
         };

         this.setBeginUserStudyFn = function(fn)
         {
            openStudyCourseFn = fn;
         };
      }]
   });
});
