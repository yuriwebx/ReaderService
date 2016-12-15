define([ 'module', 'jquery', 'underscore', 'ngModule', 'swLoggerFactory'],
function( module,   $,        _,            ngModule,   swLoggerFactory )
{
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swHttp', [
           '$http', '$q', 'swUtil', 'swEntityFactory',
   function($http,   $q,   swUtil,   swEntityFactory )
   {
      logger.trace('register');
      
      /**
       * Utility service for making http calls to the server.
       */
      function Http()
      {
         //////////////////////////////////////////////////////////////////////
         
         var _this = this;
         
         //////////////////////////////////////////////////////////////////////
         
         // Default 'noop' interceptor
         // See HttpInterceptor.js
         var _interceptor =
         {
            ///////////////////////////////////////////////////////////////////
            // Interceptors for business requests (see below create/get/search/update/remove)
            beforeRequest:         function() { return $q.when(); },
            beforeResponseError:   function() { return $q.when(); },
            beforeResponseSuccess: function(response, updateResult)
            {
               /*jshint unused:true */
               updateResult();
               return $q.when();
            },
            
            ///////////////////////////////////////////////////////////////////
            // Interceptors for service requests where "silence" is necessary (see below call/callSync)
            // "Silence" means no logger, no MessageBuffer, no angular digest
            beforeCall:        function() {},
            beforeCallSuccess: function(response) { return response; },
            beforeCallError:   function(response) { return response; },
            
            ///////////////////////////////////////////////////////////////////
            rewriteUrl:        function(url) { return url; }
         };
         
         this.setInterceptor = function(interceptor)
         {
            _interceptor = interceptor;
         };
               
         //////////////////////////////////////////////////////////////////////
         
         // create a possibility for wrapping/decorating 
         this.$http = function(config)
         {
            return $http(config);
         };
               
         //////////////////////////////////////////////////////////////////////
         
          /*
           * Performs http call to the server using angular's $http
           * @param
           *    - config     {object} - config to be called on angular's $http(config);
           *                 @see http://docs.angularjs.org/api/ng.$http
           *    - resultType {string} - type of result value to be created with swEntityFactory
           *    - result     (optional) {object|Object[]} - result object which should be updated with data from the server.
           *                 if skipped, service will return new instance for every call.
           *
           * @returns {object|Object[]} value of resultType with $promise attribute added.
           *          Result is returned immediately without waiting data to be returned from the server.
           *          @see http://docs.angularjs.org/api/ng.$q for $promise api description
           */
          this.create = function(config, destinationType, destination)
          {
              config.method = 'POST';
              config.headers = {'cache-control': 'no-cache'};
              return invokeForEntity(config, destinationType, destination);
          };

          this.get = function(config, destinationType, destination)
          {
              config.method = 'GET';
              return invokeForEntity(config, destinationType, destination);
          };

          this.search = function(config, destinationType, destination)
          {
              config.method = 'GET';
              return invokeForArray(config, destinationType, destination);
          };

          this.update = function(config, destinationType, destination)
          {
              config.method = 'PUT';
              config.headers = {'cache-control': 'no-cache'};
              return invokeForEntity(config, destinationType, destination);
          };

          this.remove = function(config, destinationType, destination)
          {
              config.method = 'DELETE';
              return invokeForEntity(config, destinationType, destination);
          };

          //////////////////////////////////////////////////////////////////////
          
          /*
           * Performs http call to the server using angular's $http.
           * Intended for cases when client does not want to use 'EntityFactory' framework.
           * Mimics angular's $http API
           * 
           * @param
           *    - config     {object} - config to be called on angular's $http(config);
           *                 @see http://docs.angularjs.org/api/ng.$http
           *
           * @returns promise that resolved to $http response
           */
          this.invoke = function(config)
          {
             var response;
             var updateResult = function(res) { response = res; };
             return invokeHttp(config, {}, updateResult).$promise.then(function()
             {
                // arguments[0] is 'result' here
                return response;
             });
          };

          //////////////////////////////////////////////////////////////////////
          
          this.composeUri = function(destination, params)
          {
             var path = _interceptor.rewriteUrl(destination) + '?';
             _.each(params, function(value, key)
             {
                if (_.isArray(value))
                {
                   _.forEach(value, function(element)
                   {
                      path = path.concat(key, '=', encodeURIComponent(element), '&');
                   });
                }
                else
                {
                   path = path.concat(key, '=', encodeURIComponent(value), '&');
                }
             });
             path = path.substr(0, (path.length - 1));
             return path;
          };
             
          //////////////////////////////////////////////////////////////////////
          
          var invokeForEntity = function(config, destinationType, destination)
          {
             var result = destination || swEntityFactory.create(destinationType);
             return invokeHttp(config, result, function(response)
             {
                result.update(swEntityFactory.create(destinationType, response.data));
             });
          };
          
          var invokeForArray = function(config, destinationType, destination)
          {
             var result = destination || [];
             return invokeHttp(config, result, function(response)
             {
                result.splice(0);
                for (var i = 0; i < response.data.length; i++)
                {
                   result[i] = swEntityFactory.create(destinationType, response.data[i]);
                }
             });
          };
          
          var invokeHttp = function(config, result, updateResult)
          {
             config.url = _interceptor.rewriteUrl(config.url);
             logger.trace(config.method, config.url);
             
             config.data = swUtil.removePrivateProperties(config.data);
             
             result.$promise = _interceptor.beforeRequest(config)
             .then(function()
             {
                return _this.$http(config);
             })
             .then(
                function(response)
                {
                   logger.trace(
                      response.config.method,
                      response.config.url,
                      response.status
                   );
                   
                   if ( !response.data )
                   {
                      throw new Error('no data in response');
                   }
                   
                   function _updateResult()
                   {
                      updateResult(response);
                   }
                   
                   return _interceptor.beforeResponseSuccess(response, _updateResult).then(function()
                   {
                      return result;
                   });
                },
                function(response)
                {
                   return _interceptor.beforeResponseError(response).then(
                      function(response) // success
                      {
                         if(response){
                            updateResult(response);
                            return result;
                         }
                         else {
                            return $q.reject();
                         }
                      },
                      function() // error
                      {
                         throw new Error(JSON.stringify({
                            method: response.config.method,
                            url:    response.config.url,
                            status: response.status,
                            data:   response.data
                         }));
                      }
                   );
                }
             );
             
             return result;
          };
          
          /////////////////////////////////////////////////////////////////////////
          
          /**
           * Intended for cases when default business oriented processing
           * (logging/messages/errors/exceptions/angular-digest) should be avoided.
           *
           * Delegates directly to $.ajax().
           * config.url/type/data/async are mapped to appropriate $.ajax options.
           * Returns promise that mimics the one $http returns.
           */
          this.call = function(config)
          {
             var data = swUtil.removePrivateProperties(config.data);
             if (config.method === 'PUT' || config.method === 'POST')
             {
                data = JSON.stringify(config.data);
             }
             
             var settings = {
                url: _interceptor.rewriteUrl(config.url),
                type: config.method,
                data: data,
                dataType: 'json',
                contentType: 'application/json;charset=UTF-8',
                async: config.async
             };
             
             _interceptor.beforeCall(settings);
             
             var request = $.ajax(settings);


             var promise = request.then(
                function(data, status, xhr)
                {
                   /*jshint unused:true */
                   var response = { data: xhr.responseJSON, status: xhr.status }; // mimic angular $http api
                   return _interceptor.beforeCallSuccess(response);
                },
                function(xhr)
                {
                   var response = { data: xhr.statusText,   status: xhr.status, config: settings }; // mimic angular $http api
                   return _interceptor.beforeCallError(response);
                }
             );

             promise.abort = function() {
                request.abort();
             };

             promise.always(function() {
                promise.abort = null;
             });
             return promise;
          };
          
          /**
           * Invokes this.call() with predefined 'async: false'.
           * Note that it does not return (holds js execution) until response is received.
           */
          this.callSync = function(config)
          {
             config.async = false;
             return this.call(config);
          };
          
      }
      
      return new Http();

   }]);
});