
define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['$window',
                 'swUserService',
                 'swUnifiedSettingsService',
                 'swOfflineModeService',
                 'swAgentService',
                 function ($window,
                           swUserService,
                           swUnifiedSettingsService,
                           swOfflineModeService,
                           swAgentService) {

         /* --- api --- */
         this.addNotificationListener     = addNotificationListener;
         this.removeNotificationListener  = removeNotificationListener;
         this.ping   =  _ping;

         /* === impl === */
         var _interval  = 0,
             _cache     = {},
             logger     = this.logger,
             setTimeout    = $window.setTimeout,
             clearTimeout  = $window.clearTimeout,
             INTERVAL_TIME = 60 * 1000;

         function addNotificationListener(name, paramsGetter, listener) {
            if (!_.has(_cache, name)) {
              _cache[name] = {
                listeners : [listener],
                params    : paramsGetter
              };
            }
            else {
              _cache[name].listeners = _.union(_cache[name].listeners, [listener]);
            }

            if ( !_interval )
            {
               if ( swUserService.isAuthenticated() )
               {
                  _pingDelayed();
               }
               else
               {
                  swUnifiedSettingsService.addOnSettingsChangeListener('session', 'profile', _.once(_pingDelayed));
               }
            }
         }

         function removeNotificationListener(name, listener) {
            if (!listener) {
              delete _cache[name];
            }
            else {
              if (_.has(_cache, name)) {
                _.pull(_cache[name].listeners, listener);
                if (!_cache[name].listeners.length) {
                  delete _cache[name];
                }
              }
            }
            if ( Object.keys(_cache) === 0 )
            {
               _stop();
            }
         }

         function _ping() {
            var _params = {swBlockUserInput : false};
            if (swUserService.isAuthenticated()) {
               _stop();
               swAgentService.request('post', 'Notification', 'usernotification',
                 _.reduce(_cache, _reducer, {}), _params)
                    .then(_onSuccess, _onError);
               //swRestService.call('post', 'Notification', 'usernotification', _.reduce(_cache, _reducer, {})).then(_onSuccess, _onError);
            }
         }

         function _pingDelayed() {
            _interval = setTimeout(_ping, INTERVAL_TIME);
         }

         function _reducer(memo, data, name) {
            memo[name] = data.params();
            return memo;
         }

         function _onSuccess(response) {
            _.each(response.data, function(data) {
               if ( _.has(_cache, data.name) ) {
                  _.each(_cache[data.name].listeners, _.method('call', null, data.data));
               }
               else {
                  _logError(data);
               }
            });
            _pingDelayed();
         }

         function _logError(data) {
            logger.error(data);
         }

         function _onError() {
            setTimeout(_ping, INTERVAL_TIME / (swOfflineModeService.isOffline() ? 1 : 2));
         }

         function _stop() {
            clearTimeout(_interval);
         }
      }]
   });
});
