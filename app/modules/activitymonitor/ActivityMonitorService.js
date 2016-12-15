define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module   : module,
      service  : [ActivityMonitorService]
   });

   function ActivityMonitorService() {
      /* --- api --- */
      this.getOnline = getOnline;
      this.setOnline = setOnline;
      this.getActivityUsersList  = getUserActivityUsersList;
      this.setActivityUsersList  = setActivityUsersList;
      this.addActivityMonitorListener = addActivityMonitorListener;
      this.removeActivityMonitorListener = removeActivityMonitorListener;
      this.onActivityMonitorSet = onActivityMonitorSet;

      /* === impl === */
      // see ActivityMonitorRunner.Observable
      var online = null;
      var activityUsersList = null;
      var activityMonitorListeners = [];

      function addActivityMonitorListener (listener) {
         activityMonitorListeners = _.union(activityMonitorListeners, [listener]);
      }

      function removeActivityMonitorListener (listener) {
         _.pull(activityMonitorListeners, listener);
      }

      function onActivityMonitorSet (data) {
         _.each(activityMonitorListeners, _.method('call', null, data));
      }

      function setOnline(atom) {
         online = atom;
      }

      function getOnline() {
         return online;
      }

      function setActivityUsersList(atom) {
         activityUsersList = atom;
      }

      function getUserActivityUsersList() {
         return activityUsersList;
      }
   }
});
