define([
      'angular',
      'module',
      'swServiceFactory',
      'Context'
   ],
   function (angular, module, swServiceFactory, Context) {
      'use strict';
      swServiceFactory.create({
         module : module,
         service : ['swHttp', '$http', '$q', '$timeout', function (swHttp, $http) {
            var runid = '';
            var _self = this;
            var createRequestParams = function(method, controller, action, data, params){
                if (typeof action === 'object') {
                  data = action;
                  action = '';
               }
               var url = _self.getUrlString(controller, action);
               var conf = {
                  method : method,
                  url : url
               };
               if (data) {
                  if (['post', 'put'].indexOf(method) > -1) {
                     conf.data = data;
                     if (params && params.hasOwnProperty('fileType')) {
                        conf.transformRequest = angular.identity;
                        conf.headers = {'Content-Type': undefined};
                        conf.params = params;
                     }
                  }
                  else {
                     conf.params = data;
                  }
                  if (params && params.hasOwnProperty('swBlockUserInput')) {
                     conf.swBlockUserInput = params.swBlockUserInput;
                  }
               }
               return conf;
            };

            this.addRunId = function(runId){
               runid = runId;
            };
            this.restRequest = function (method, controller, action, data, params) {
               var conf = createRequestParams(method, controller, action, data, params);
               return $http(conf);
            };

            this.restSwHttpRequest = function (method, controller, action, data, params) {
               var conf = createRequestParams(method, controller, action, data, params);
               return swHttp.invoke(conf);
            };

            this.call = function(method, controller, action, data, params) {
               var conf = createRequestParams(method, controller, action, data, params);
               conf.data = conf.data || conf.params;
               conf.method = conf.method.toUpperCase();
               delete conf.params;
               return swHttp.call(conf);
            };


            this.getUrlString = function (controller, action) {
               var config = Context.parameters.EpubConfig;
               var url = Context.serverUrl;

               if (config.hasOwnProperty(controller + 'Path')) {
                  url += config[controller + 'Path'];
               }
               else {
                  url += controller;
               }
               url += '/' + action;
               if (runid) {
                  url += (url.indexOf('?') > -1 ? '&' : '?') + 'RunId=' + runid;
               }
               return url;
            };

         }]
      });
   }
);