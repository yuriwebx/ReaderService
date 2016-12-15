define([
        
   'module',
   'underscore',
   'swServiceFactory'
   
   ], function(
         
   module,
   _,
   swServiceFactory
   
   ){
      'use strict';
      
      swServiceFactory.create({
         module: module,
         service: [function()
         {

            ///////////////////////////////////////////////////////////////////
            
            var _this = this;
            
            ///////////////////////////////////////////////////////////////////
            
            var _suspended = 0;
            
            this.suspend = function()
            {
               _suspended++;
               _this.logger.trace('suspend', _suspended);
            };
            
            this.resume = function()
            {
               _this.logger.trace('resume', _suspended);
               _suspended--;
            };
            
            ///////////////////////////////////////////////////////////////////
            
            var _listeners = [];
            
            function _processListeners(method)
            {
               _.each(_listeners, function(listener)
               {
                  listener[method]();
               });
            }
            
            this.addListener = function(listener, id)
            {
               _this.logger.trace('addListener', id);
               _listeners.push(listener);
            };
            
            this.removeListener = function(listener, id)
            {
               _this.logger.trace('removeListener', id);
               _listeners = _.without(_listeners, listener);
            };
            
            ///////////////////////////////////////////////////////////////////
            
            this.start = function(id)
            {
               var end = _.noop;
               if ( _suspended )
               {
                  _this.logger.trace('skip', id);
               }
               else
               {
                  _this.logger.trace('start', id);
                  _processListeners('start');
                  end = function()
                  {
                     _this.logger.trace('end', id);
                     _processListeners('end');
                  };
               }
               return end;
            };
            
         }]
      });
   });
