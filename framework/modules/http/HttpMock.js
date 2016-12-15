define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'swServiceFactory',
   './HttpMockRegistry'
],
function(
   module,
   _,
   ngModule,
   swLoggerFactory,
   swServiceFactory,
   httpMockRegistry
){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   var _mode;
   var _enabled = false;
   var _passThrough = true;
   var _latency = 0;

   swServiceFactory.create({
      module: module,
      service: [function()
      {
         this.configure = function(mode)
         {
            this.logger.trace('configure', mode);
            _mode = mode;
            _enabled = !_.isUndefined(mode);
         };
      }]
   });
   
   ngModule.run([
                 
     '$q',
     '$timeout',
     'swHttp',
     
   function(
        
      $q,
      $timeout,
      swHttp
      
   ){
     
      logger.trace('run');
     
      var _$http = swHttp.$http;
      swHttp.$http = function(config)
      {
         config.mode = _mode;
         var mock = httpMockRegistry.getMock(config);
         if ( _enabled && (mock || !_passThrough) )
         {

            logger.trace(config.method, config.url);
            
            return $timeout(function()
            {
               var result = mock ? mock(config) : [599, 'No mock found for ' + config.url];

               var response = {
                     config: config,
                     status: result[0],
                     data: result[1]
               };

               logger.trace(
                     response.config.method,
                     response.config.url,
                     response.status
               );
               
               if ( result[0] < 200 || result[0] > 299 )
               {
                  response = $q.reject(response);
               }

               return response;

            }, _latency);

         }
         else
         {
            return _$http.apply(_$http, arguments);
         }
      };
      
   }]);
   
});