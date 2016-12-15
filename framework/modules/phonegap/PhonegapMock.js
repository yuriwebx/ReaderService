define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'swServiceFactory',
   './PhonegapMockRegistry',
],
function(
   module,
   _,
   ngModule,
   swLoggerFactory,
   swServiceFactory,
   phonegapMockRegistry
){

   'use strict';

   var _mode;
   var _enabled = false;
   
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
                 
        'swPhonegap',
        '$q',
        '$timeout',
        
     function(
           
         swPhonegap,
         $q,
         $timeout
         
     )
     {
        
        var logger = swLoggerFactory.getLogger(module.id);
        logger.trace('run');
        
        var _latency = 0;
        
        var _isAvailable = swPhonegap.isAvailable;
        swPhonegap.isAvailable = function()
        {
           return _enabled || _isAvailable();
        };
        
        var _exec = swPhonegap.exec;
        swPhonegap.exec = function(params)
        {
           var pluginInvocation = _.extend({mode: _mode}, params);
           
           if ( _enabled )
           {
              var mock = phonegapMockRegistry.getMock(pluginInvocation);
              if ( mock )
              {
                 return $timeout(function()
                 {
                    try
                    {
                       pluginInvocation.result = mock(pluginInvocation);
                       logger.trace(pluginInvocation);
                       return $q.when(pluginInvocation.result);
                    }
                    catch ( e )
                    {
                       pluginInvocation.message = e.message;
                       logger.trace(pluginInvocation);
                       return $q.reject(pluginInvocation.message);
                    }
                 }, _latency);
              }
              else
              {
                 pluginInvocation.message = 'No mock found for ' + pluginInvocation.plugin + '.' + pluginInvocation.method;
                 logger.trace(pluginInvocation);
                 return $q.reject(pluginInvocation.message);
              }
           }
           else
           {
              return _exec.apply(swPhonegap, arguments);
           }
        };
        
     }]);
});