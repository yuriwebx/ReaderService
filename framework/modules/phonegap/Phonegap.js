define([

   'module',
   'underscore',
   'swServiceFactory',
   
   ], function(

   module,
   _,
   swServiceFactory
   
   ){

   'use strict';
   
   swServiceFactory.create({
      module: module,
      service: ['$window', '$q', function($window, $q)
      {
                   
         var _this = this;
         
         this.isAvailable = function()
         {
            return !!$window.cordova;
         };
         
         /*
          * 'stub' is intended for cases when plugin is not implemented yet.
          * In such a case we provide a stub for production mode
          * and a mock for development mode.
          */
         this.exec = function(params)
         {
            _this.logger.trace('exec', params);
            
            var defer = $q.defer();
            
            function success(arg)
            {
               _this.logger.trace('success', params, arg);
               defer.resolve(arg);
            }
            
            function error(arg)
            {
               _this.logger.error('error', params, arg);
               defer.reject(arg);
            }
            
            if ( _this.isAvailable() )
            {
               if ( _.isUndefined(params.stub) )
               {
                  $window.cordova.exec(success, error, params.plugin, params.method, params.args);
               }
               else
               {
                  success(params.stub);
               }
            }
            else
            {
               error(params.plugin + '.' + params.method + '\nFeature not supported');
            }
            
            return defer.promise;
         };
         
      }]
   });

});
