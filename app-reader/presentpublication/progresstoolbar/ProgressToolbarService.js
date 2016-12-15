define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function () {
            var listeners = [];

            this.onPositionChange = function (locators) {
               _.each(listeners, _.method('call', null, locators));
            };

            this.addOnPositionChangeListener = function (listener) {
               listeners = _.union(listeners, [listener]);
            };

            this.removeOnPositionChangeListener = function (listener) {
               _.pull(listeners, listener);
            };

            var popupVisibility = false;

            this.getStartPopupVisibility = function () {
               return popupVisibility;
            };

            this.setStartPopupVisibility = function (isVisible) {
               popupVisibility = isVisible;
            };
         }]
   });
});