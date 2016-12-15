define([
      'module',
      'swServiceFactory',
      'underscore'
   ],
   function (module, swServiceFactory, _) {
      'use strict';
      var
         _isOffline = false,
         restProcessors = {},
         onlineEventListeners = [];

      swServiceFactory.create({
         module : module,
         service : ['swUnifiedSettingsService', 'swAgentService',
            function (swUnifiedSettingsService, swAgentService) {

               function isOffLineResponse(response) {
                  var offLine = true;
                  if (_.get(response, 'data', null) === 'abort') {
                     offLine = false;
                  }
                  return offLine;
               }

               this.setOffline = function setOffline(response) {
                  if (!isOffLineResponse(response)) {
                     return;
                  }
                  if (!_isOffline) {
                  _isOffline = true;
                  this.onModeChange(false);
                  }
               };
               this.setOnline = function setOnline() {
                  var shouldFireEvent = _isOffline;
                  _isOffline = false;
                  if (shouldFireEvent) {
                     this.onModeChange(true);
                  }
                  // if (onlineEventListeners.length && shouldFireEvent) {
                  //    onlineEventListeners.forEach(function (listener) {
                  //       listener();
                  //    });
                  // }
               };
               this.isOffline = function isOffline() {
                  return _isOffline;
               };

               this.isOfflineModeEnabled = function() {
                  return swAgentService.isEnabled();
               };

               this.addOnlineModeChangeListener = function addOnlineModeChangeListener (listener) {
                  onlineEventListeners = _.union(onlineEventListeners, [listener]);
               };

               this.removeOnlineModeChangeListener = function removeOnlineModeChangeListener (listener) {
                  _.pull(onlineEventListeners, listener);
               };

               this.onModeChange = function onModeChange (isOnline) {
                  _.each(onlineEventListeners, _.method('call', null, isOnline));
               };

               this.processRestRequest = function (config) {
                  var url = config.url;
                  var ind = url.indexOf('/rest/'), query;
                  if (ind > -1) {
                     url = url.substr(ind);
                  }
                  ind = url.indexOf('?');
                  if (ind > -1) {
                     query = url.substr(ind + 1);
                     url = url.substr(0, ind);
                  }
                  if (restProcessors.hasOwnProperty(url)) {
                     return restProcessors[url](config);
                  }
               };

               addRestProcessor('/rest/applicationsession/', processApplicationSession);

               this.addRestProcessor = addRestProcessor;


               function addRestProcessor(path, callback) {
                  restProcessors[path] = callback;
               }

               function processApplicationSession(config) {
                  if (config.method.toLowerCase() === 'post') {
                     var SID = swUnifiedSettingsService.getSetting('session', 'SID'),
                        profile = swUnifiedSettingsService.getSetting('session', 'profile');
                     if (SID) {
                        var conf = JSON.parse(JSON.stringify(config));
                        conf.data = {
                           sessionId : SID,
                           user : profile,
                           runId : 'offlineRunId'
                        };
                        return conf;
                     }
                  }
               }
            }
         ]
      });
   });
