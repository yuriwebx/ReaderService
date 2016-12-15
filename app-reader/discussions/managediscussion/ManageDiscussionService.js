define([
   'module',
   'underscore',
   'swServiceFactory',
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function () {
            var listeners = [];

            this.onDiscussionToggled = function (_options) {
               _.each(listeners, _.method('call', null, _options));
            };

            this.addOnDiscussionToggledListener = function (listener) {
               listeners = _.union(listeners, [listener]);
            };

            this.removeOnDiscussionToggledListener = function (listener) {
               _.pull(listeners, listener);
            };
         }]
   });
});