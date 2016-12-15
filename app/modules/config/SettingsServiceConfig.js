define([
   'underscore',
   'ngModule',
   'Context',
   'swAppUrl'
], function(_, ngModule, Context, swAppUrl) {
   'use strict';

   ngModule.constant('SettingsStorageKey', 'USER_SETTINGS');

   ngModule.run([
      'swUnifiedSettingsService',
      //'swRestService',
      'swUserService',
      //'swOfflineModeService',
      'swAgentService',
      function (
         swUnifiedSettingsService,
         //swRestService,
         swUserService,
         //swOfflineModeService,
         swAgentService
      ) {
         var definitions = Context.parameters.SettingsDefinition;
         /* --- run --- */

         var options = {
            definitions    : definitions,
            $groupMapper   : _detectKey
         };

         swUnifiedSettingsService._configure(options);

         _addRemoteListeners();

         /* === impl === */

         var globalKeys = ['session'];

         function _addRemoteListeners() {
            _.each(definitions, function(definition, groupName) {
               if (!_.isObject(definition)) {
                  return;
               }

               _.each(definition, function(data, name) {
                  if (!_.isObject(data) || (data.$scope !== 'Shared')) {
                     return;
                  }

                  swUnifiedSettingsService.addOnSettingsChangeListener(groupName, name, _postSetting);
               });
            });
         }

         function _postSetting(setting) {
            //if(!swOfflineModeService.isOffline()) {
               swAgentService.request('post', 'Settings', '', setting, {swBlockUserInput: false});
            //}
         }

         var _params = ['LibraryParameters'];

         function _detectKey(groupName) {
            if (_.contains(_params, groupName)) {
               return groupName;
            }

            var arr = ['irls_settings'];
            arr.push(swAppUrl.directory.split('/').slice(0, -2));

            var userId = swUserService.getUserId();

            if (!_.contains(globalKeys, groupName) && userId) {
               arr.push(userId);
            }
            arr.push(groupName);
            return arr.join('_');
         }
   }]);
});
