/*global window: false */

define([
        
   'underscore',
   './Message'
   
], function(
      
   _,
   Message
   
)
{
   'use strict';
   
   // IMPORTANT!
   // Implementation should strictly avoid pushing messages
   // to MessageBuffer (in particular, should not use logger).
   // Otherwise infinite message loop is possible.
   
   function MessageBuffer()
   {
      /**
       * Base class (constructor) of messages this buffer accepted.
       */
      this.Message = Message;
      
      var _impl;
      
      var _buffer = []; // temporary buffer until implementation is provided
      var BUFFER_SIZE_MAX        = 1000; // remove REMOVE_WHEN_OVERFLOWED top messages when buffer size exceeds this value
      var REMOVE_WHEN_OVERFLOWED =  200;
      
      /**
       * Provide implementation of the following interface:
       *    push(message)
       *    flush()       // returns promise
       *    flushSync()   // holds execution until completed
       */
      this.setImpl = function(impl)
      {
         _impl = impl;
         
         _.each(_buffer, function(m)
         {
            _impl.push(m);
         });
         
         _buffer = [];
      };
      
      /**
       * Flush all accumulated messages to server.
       * Return promise.
       */
      this.flush = function()
      {
         return _impl && _impl.flush();
      };
      
      /**
       * Flush all accumulated messages to server synchronously.
       * Pending messages are taken also. So duplication is possible.
       * Hold execution until completed.
       */
      this.flushSync = function()
      {
         return _impl && _impl.flushSync();
      };
      
      /**
       * Push message to buffer.
       */
      this.push = function(message)
      {
         if ( _impl )
         {
            _impl.push(message);
         }
         else
         {
            if ( _buffer.length === BUFFER_SIZE_MAX )
            {
               _buffer = _.tail(_buffer, REMOVE_WHEN_OVERFLOWED);
               if ( window.console && window.console.log )
               {
                  window.console.log('MessageBuffer: buffer overflowed, top', REMOVE_WHEN_OVERFLOWED, 'messages removed');
               }
            }
            _buffer.push(message);
         }
      };
   }
   
   return new MessageBuffer();
   
});
