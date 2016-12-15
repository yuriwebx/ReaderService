define([

  'module',
  'underscore',
  'jquery',
  'ngModule',
  'swLoggerFactory'

], function(

   module,
   _,
   $,
   ngModule,
   swLoggerFactory

){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.service('swMessageBufferImplDefault',
           ['$window', 'swHttp',
   function( $window,   swHttp )
   {
      logger.trace('register');
      
      // IMPORTANT!
      // Implementation should strictly avoid pushing messages
      // to MessageBuffer (in particular, should not use logger).
      // Otherwise infinite message loop is possible.
      
      var DEBOUNCE_TIMEOUT       = 5000; // ms // subsequent messages during this time frame will not be flushed
      var BUFFER_SIZE_THRESHOLD  =  100; // flush buffer when its size (without pending messages) exceeds this value
      var BUFFER_SIZE_MAX        = 1000; // remove REMOVE_WHEN_OVERFLOWED top messages when buffer size exceeds this value
      var REMOVE_WHEN_OVERFLOWED =  200;

      var _buffer = [];
      var _pending = 0; // number of messages sent and request is not completed yet
      var _removed = 0; // number of messages removed while current request is not completed yet
      
      var _lastFlush = $.when();
      // jQuery promises used to ensure true "silence".
      // Angular promises prohibited here as they require digest cycle -> watch expressions re-evaluation.
      
      var _closed;
      
      var RETRY_AFTER_ERROR_TIMEOUT = 20000; // ms
      var _retryTimer;
      
      /**
       * Flush all accumulated messages to server.
       * Return promise.
       */
      this.flush = function()
      {
         return _flush();
      };
      
      /**
       * Flush all accumulated messages to server synchronously.
       * Pending messages are taken also. So duplication is possible.
       * Hold execution until completed.
       */
      this.flushSync = function()
      {
         return _flushSync();
      };
      
      /**
       * Put message to buffer.
       * Schedule flush to server.
       */
      this.push = function(message)
      {
         if ( _closed )
         {
            return;
         }
         
         if ( _buffer.length === BUFFER_SIZE_MAX )
          {
             _buffer = _.tail(_buffer, REMOVE_WHEN_OVERFLOWED);
             _removed += REMOVE_WHEN_OVERFLOWED;
             _log('MessageBufferService: buffer overflowed, top', REMOVE_WHEN_OVERFLOWED, 'messages removed');
          }
       
         _buffer.push(message);
         
         _flushWhenIdle();
         _flushWhenSize();
      };
      
      var _flushWhenIdle = _.debounce(function()
      {
         _flushApply();
      },
      DEBOUNCE_TIMEOUT);
                  
      var _flushWhenSize = function()
      {
         if ( _buffer.length - _pending === BUFFER_SIZE_THRESHOLD )
         {
            // 'window.setTimeout' is used to
            // - ensure non-angular context regardless who invokes 'push'
            // - separate 'flushing' from current execution stack
            $window.setTimeout(function()
            {
               _flushApply();
            }, 0);
         }
      };
                  
      function _flushApply()
      {
         if ( !_closed )
         {
//            $rootScope.$apply(function()
//            {
// angular digest removed as we need really "silent" mode here.
               _flush();
//            });
         }
      }
      
      function _flush()
      {
         $window.clearTimeout(_retryTimer);
         _lastFlush = _lastFlush.then(__flush, __flush);
         return _lastFlush;
      }
      
      function __flush()
      {
         if ( _buffer.length === 0 )
         {
            return $.when();
         }
         
         _pending = _buffer.length;
         _removed = 0;
//       _log('MessageBufferService:', _pending, 'messages to be flushed');
         
         return swHttp.call({
            method: 'PUT',
            url: 'rest/message',
            data: _buffer
         }).then(
            function()
            {
               _log('MessageBufferService:', _pending, 'messages flushed');
               if ( _pending > _removed )
               {
                  _buffer = _.tail(_buffer, _pending - _removed);
               }
               _pending = 0;
            },
            function(response)
            {
               var error = JSON.stringify({status: response.status, data: response.data});
               if ( response.swFatal || response.swError )
               {
                  // server received messages but failed to process them
                  _log('MessageBufferService: flushing failed:', error);
                  _buffer = [];
                  if ( response.swFatal )
                  {
                     _closed = true;
                  }
               }
               else
               {
                  // server did not receive messages
                  _log('MessageBufferService: flushing failed:', error,
                       '- will retry in', RETRY_AFTER_ERROR_TIMEOUT, 'ms',
                       'buffer size:', _buffer.length);
                  $window.clearTimeout(_retryTimer);
                  _retryTimer = $window.setTimeout(function()
                  {
                     _flushApply();
                  }, RETRY_AFTER_ERROR_TIMEOUT);
                  _pending = 0;
               }
            }
         );
      }
      
      function _flushSync()
      {
         if ( _buffer.length > 0 )
         {
            return swHttp.callSync({
               method: 'PUT',
               url: 'rest/message',
               data: _buffer
            }).then(function()
            {
               _removed = _buffer.length;
               _buffer = [];
            });
         }
      }
      
      function _log()
      {
         if ( $window.console && $window.console.log )
         {
            $window.console.log(_.toArray(arguments).join(' '));
         }
      }
      
   }]);
   
});