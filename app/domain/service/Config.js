   (function (window) {
   'use strict';

   define([
      'angular',
      'module',
      'swLoggerFactory',
      'jquery',
      'q',
      'underscore',
      'Context',
      'ApplicationContext',
      'ExecutionContext',
      'ClientNodeContext',
      //'./ParamParser',
      'text!config/default.config.json'
   ],

   function (
      angular,
      module,
      swLoggerFactory,
      $,
      q,
      _,
      Context,
      ApplicationContext,
      ExecutionContext,
      ClientNodeContext/*,
      ParamParser*/) {

      var logger = swLoggerFactory.getLogger(module.id);

      function _reqireJSON(path) {
         var defer = q.defer();
         try {
            requirejs([path], _onSuccess, _onError);
         } catch (error) {
            logger.info('No configuration was found');
            defer.resolve({});
         }

         return defer.promise;

         function _onSuccess(params) {
            defer.resolve(angular.fromJson(params));
         }

         function _onError(e) {
            logger.error('No configuration was found.', e);
            defer.resolve({});
         }
      }

      function _loadCustomJSON(fileName) {
         var defer = q.defer();
         var host = Context.serverUrl || '../';
         var path = '';
         if (!ClientNodeContext.native) {
            path = ApplicationContext.application.toLowerCase() + '/';
         }
         else {
            host = '';
         }
         $.getJSON(host + path + 'config/' + fileName).done(defer.resolve).fail(defer.reject);
         return defer.promise;
      }

      function _loadCustomParameters() {
         var url;
         if (ClientNodeContext.native) {
            var _configs = ['deployment.config.json'].map(_loadCustomJSON);
            _configs.push(_loadClientJSON('build.config.json'));
            return _loadParamsAndMerge(_configs);
         }
         else {
            var defer = q.defer();
            url = _detectApplicationUrl().replace(/index[a-z\._]+/gi, '') + 'config/customConfigParameters';
            $.getJSON(url).done(defer.resolve).fail(defer.reject);
            return defer.promise;
         }
      }


      function _loadClientJSON(fileName) {
         return _reqireJSON('text!./config/' + fileName);
      }

      function _loadRuntimeParams() {
         // 1) JSON Map read from "client.config.json" in case of application executed in native wrapper
         // 2) JSON Map read from "local.client.config.json" in case of application executed in native wrapper
         // 3) Query string converted to JSON Map
         // 4) Command line parameters (for native applications) converted to JSON Map
         //var _params = ['client.config.json', 'local.client.config.json'];

         if (ClientNodeContext.native) {
            return q.when({});
         }

         //if(ApplicationContext.application === 'searcher'){
         var serverURL = "{{serverURLPlaceholder}}";
         if (serverURL.indexOf('{{') === 0 || serverURL === "undefined") {
            serverURL = '';
         }
         return q.when({serverURL : serverURL});

         //}
         //else {
         //   return q.all(_params.map(_loadClientJSON)).then(function (results) {
         //      results.push(ParamParser.parseUrl(window.location.href));
         //      return _mergeJSONs(results);
         //   });
         //}
      }

      function _mergeJSONs(results) {
         // deep copy
         results.unshift(true);

         return $.extend.apply($, results);
      }

      function _loadCustomConfigModeParameters(mode) {
         return _loadCustomJSON('mode.' + mode + '.config.json');
      }

      function _loadDefaultJSON(fileName) {
         return angular.fromJson(requirejs('text!config/' + fileName));
      }

      function _loadLanguages(application, lang) {
         // already defined. see 'app\domain\modules\context\localizationsModule.js'
         application = application.toLowerCase();

         var results = [
            _loadDefaultJSON(                       'language.cmn.' + lang + '.json'),
            _loadDefaultJSON(       'language.' + application + '.' + lang + '.json'),
            _loadDefaultJSON(                'custom.language.cmn.' + lang + '.json'),
            _loadDefaultJSON('custom.language.' + application + '.' + lang + '.json')
         ];

         return _mergeJSONs(results);
      }

      function _loadDefaultConfigModeParameters(mode) {
         return _loadDefaultJSON('mode.' + mode + '.config.json');
      }

      function _loadDefaultParameters() {
         return _loadDefaultJSON('default.config.json');
      }

      function _detectLanguage(params) {
         var defer = q.defer();
         var navigator = window.navigator;
         if (window.cordova) {
            navigator.globalization.getPreferredLanguage(function(currentLang) {
               defer.resolve(currentLang);
            }, function() {
               defer.resolve(params.defaultLanguage);
            });
         }
         else {
            var currentLang = navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage);
            // "en"|"en-US"|"en_US" -> "en"
            currentLang = currentLang.substr(0, 2);
            defer.resolve(currentLang);
         }

         return defer.promise.then(_filter);
         function _filter(currentLang) {
            return _.contains(params.supportedLanguages, currentLang) ? currentLang : params.defaultLanguage;
         }
      }

      function _loadParamsAndMerge(listOfPromises) {
         return q.all(listOfPromises).then(function(results) {
            // deep copy
            results.unshift(true);
            return $.extend.apply($, results);
         });
      }

      function _postConfigure(config, application) {
         if(config.applicationSpecificConfigs && config.applicationSpecificConfigs.hasOwnProperty(application.toLowerCase())){
            var specificConfig = config.applicationSpecificConfigs[application.toLowerCase()];
            delete config.applicationSpecificConfigs;
            config = _.merge({}, config, specificConfig, function (s, d) {
               if (_.isArray(s) && _.isArray(d) && d.length === 0) {
                  return d;
               }
            });
         }

         config.EpubConfig.ServerUrl = config.serverURL || config.EpubConfig.ServerUrl;
         if (config.EpubConfig.ServerUrl.indexOf('../') === 0) { // relative to absolute server url.
            var link = window.document.createElement('A');
            link.href = config.EpubConfig.ServerUrl;
            config.EpubConfig.ServerUrl = link.href;
         }

         return config;
      }

      function _detectApplicationUrl() {
         if (ClientNodeContext.native || ApplicationContext.application === 'searcher') {
            return Context.serverUrl + '/' + ApplicationContext.application.toLowerCase() + '/';
            // var scheme = Context.parameters.branch + Context.parameters.brand;
            // scheme = scheme.toLowerCase().replace(/[^a-z]/g, '');
            // return scheme + ':///';
         }
         var s = window.location.href;
         return s.replace(/(?:\?|#).+$/, '');
      }

      function _getDownloadUrl() {
         var serverUrl = Context.serverUrl;
         var downloadUrl = serverUrl;
         var a = window.document.createElement('A');
         a.href = serverUrl;
         if(Context.parameters.hasOwnProperty('CDNHostName')){
            downloadUrl = serverUrl.replace(a.hostname, Context.parameters.CDNHostName);
         }

         return downloadUrl;
      }

      return {
         init : function (application, callback) {
            ApplicationContext.application = application;

            _loadRuntimeParams().then(function(_runtimeParameters) {
               ExecutionContext.runtimeParameters = _runtimeParameters;
               ExecutionContext.configMode = _runtimeParameters.config || 'default';

               var currentUrl = _runtimeParameters.serverURL || '';
               Context.serverUrl = ApplicationContext.serverUrl = ExecutionContext.serverUrl = currentUrl;

               var data = [
                  // DefaultSystemContext.defaultParameters
                  _loadDefaultParameters(),
                  // DefaultSystemContext.defaultConfigModeParameters[configMode]
                  _loadDefaultConfigModeParameters(ExecutionContext.configMode),
                  // CustomSystemContext.customParameters
                  _loadCustomParameters(),
                  // CustomSystemContext.customConfigModeParameters[configMode]
                  _loadCustomConfigModeParameters(ExecutionContext.configMode),
                  // ExecutionContext.runtimeParameters
                  _runtimeParameters
               ];

               _loadParamsAndMerge(data).then(function(parameters) {
                  Context.parameters = _postConfigure(parameters, application);
                  if(window.cordova && window.localStorage){
                     var buildVersion = window.localStorage.getItem('currentInstalledVersion');
                     if(buildVersion){
                        Context.parameters.buildVersion = buildVersion;
                     }
                  }
                  ExecutionContext.serverUrl = ApplicationContext.serverUrl = Context.serverUrl = currentUrl || parameters.EpubConfig.ServerUrl;
                  Context.applicationUrl = ApplicationContext.applicationUrl = _detectApplicationUrl();
                  Context.downloadUrl =  _getDownloadUrl();
                  return Context.parameters;
               }).then(_detectLanguage).then(function(lang) {
                  ExecutionContext.systemLanguage  = lang;
                  Context.languageResources        = _loadLanguages(application, ExecutionContext.systemLanguage);

                  callback();
               });
            });
         }
      };
   });
}(this));