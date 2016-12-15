/*jslint bitwise: true */
define([
   'module',
   'swServiceFactory',
], function (module, swServiceFactory) {
   'use strict';
   swServiceFactory.create({
      module : module,
      service : [
         function () {
            var setDefaultListeners = [];

            this.addSetStudyGuideListener = function (listener) {
               if ( typeof listener === 'function' )  {
                  setDefaultListeners.push(listener);
               }
            };

            this.removeSetStudyGuideListener = function (listener) {
               for ( var i = 0; i < setDefaultListeners.length; ++i ) {
                  if ( setDefaultListeners[i] === listener ) {
                     setDefaultListeners.splice(i, 1);
                     break;
                  }
               }
            };

            this.setStudyGuide = function (options) {
               for ( var i = 0; i < setDefaultListeners.length; ++i ) {
                  setDefaultListeners[i](options);
               }
            };
         }]
   });
});