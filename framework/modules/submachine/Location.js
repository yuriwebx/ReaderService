/**
 * swLocation is service that provides an API for browser location/history manipulation.
 * 
 * The main goal is to provide an event when user presses "Back" button.
 * To achieve it:
 * 
 *    - on app startup, push special BACK record to history and
 *      initial path above it (see init())
 *    - all business specific location changes should be performed
 *      in "replace" mode to not change the history depth (see setPath())
 *    - when user clicks "Back" button:
 *         - event is broadcasted to inform business code about BACK event
 *         - current path is pushed to history (it will reset forward history also),
 *           and so initial state (current path above BACK record) is restored.
 *           (Note that after "Back" button pressed, BACK record becomes current,
 *           previous record becomes FORWARD.)
 *           
 * Public API:
 * 
 *    swLocation.init()
 *    swLocation.setPath(path)
 *    swLocation.getPath()
 *    swLocation.reload()
 *    
 * Broadcasting:
 *
 *    $rootScope.$broadcast('swLocationChange', {back: true})
 *       broadcasted when user presses BACK button
 *    
 *    $rootScope.$broadcast('swLocationChange', {path: <path>})
 *       broadcasted when user changes location in browser address bar
 * 
 */
define([

   'module',
   'jquery',
   'swServiceFactory',
   'swAppUrl'

   ], function(

   module,
   $,
   swServiceFactory,
   swAppUrl

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$window', '$rootScope',
       function( $window,   $rootScope )
      {
         var _this = this;
         
         var logger = this.logger;
         
         var _baseUrl = swAppUrl.withoutFragment;
         logger.trace('baseUrl', _baseUrl);
         
         var _BACK = '/BACK';
         
         var _pathSetProgrammatically;
         var _pathFromPreviousPopstate;
         var _nextEventHandler;

         this.init = function()
         {
            var path = this.getPath();
            logger.trace('init', path);
            
            _setPath(_BACK, true);
            _setPath(path,  false);
         };

         this.getPath = function()
         {
            var hash = $window.location.hash;
            var path = hash ? hash.substring(1) : '/';
//            logger.trace('getPath', path);
            return path;
         };

         this.setPath = function(path)
         {
            _setPath(path, true);
         };
         
         function _setPath(path, replace)
         {
            _pathSetProgrammatically = path;
            
            var url = _baseUrl + '#' + path;
            
            if ( $window.history.pushState )
            {
               if ( replace )
               {
                  logger.trace('history.replaceState', url);
                  $window.history.replaceState(null, null, url);
               }
               else
               {
                  logger.trace('history.pushState', url);
                  $window.history.   pushState(null, null, url);
               }
            }
            else
            {
               if ( replace )
               {
                  logger.trace('location.replace', url);
                  $window.location.replace(url);
               }
               else
               {
                  logger.trace('location.href', url);
                  $window.location.href  = url;
               }
            }
         }

         function _eventHandler()
         {
            if ( _nextEventHandler )
            {
               logger.trace('nextEventHandler');
               _nextEventHandler = _nextEventHandler();
               return;
            }
            
            var path = _this.getPath();
            
            if ( path === _pathSetProgrammatically )
            {
               logger.trace('skip path set programmatically', path);
               return;
            }
            
            if ( path === _BACK )
            {
               // We are on BACK record now. 
               // PUSH current path above BACK record
               // (it will reset forward history also).
               _setPath(_pathSetProgrammatically, false);
               
               logger.trace('back broadcasted');
               $rootScope.$broadcast('swLocationChange', {back: true});
            }
            else
            {
               logger.trace('manual path change', path);
               
               _nextEventHandler = function()
               {
                  // We are on BACK record now (see below). 
                  // PUSH current path above BACK record
                  // (it will reset forward history also).
                  _setPath(_pathSetProgrammatically, false);
                  
                  logger.trace('manual path change broadcasted', path);
                  $rootScope.$broadcast('swLocationChange', {path: path});
               };
               
               $window.setTimeout(function()
               {
                  logger.trace('history.go(-2)');
                  $window.history.go(-2);
                  // Go to BACK record.
                  // It triggers popstate/hashchange event.
                  // This event will be processed by _nextEventHandler set above.
                  // Note that _nextEventHandler will then PUSH current path above BACK record.
               });
            }
         }
         
         // Some browsers trigger 'popstate' only, some 'hashchange' only, some the both.
         
         $($window).on('popstate', function()
         {
            var path = _this.getPath();
            _pathFromPreviousPopstate = path;
            logger.trace('popstate', path);
            _eventHandler();
         });
         
         $($window).on('hashchange', function()
         {
            var path = _this.getPath();
            if ( _pathFromPreviousPopstate === path )
            {
               logger.trace('hashchange', path, 'skip path from previous popstate');
            }
            else
            {
               logger.trace('hashchange', path);
               _eventHandler();
            }
            _pathFromPreviousPopstate = undefined;
         });
         
         /////////////////////////////////////////////////////////////////////////
         
         this.reload = function()
         {
            logger.debug('reload');
            
            $($window).off('popstate hashchange');
            
            if ( $window.history.pushState )
            {
               $($window).on('popstate hashchange', function(event)
               {
                  logger.trace('reloading:', event.type);
                  $($window).off('popstate hashchange');
                  
                  _setPath('/', true);
                  // Prevent current location to be used as deeplink after reload.
                  
                  $window.setTimeout(function()
                  {
                     logger.trace('reloading: location.reload');
                     $window.location.reload(true);
                  });
               });
               
               logger.trace('reloading: history.back()');
               $window.history.back();
               // Go to BACK record to not accumulate BACK records in history on each reload.
               // It triggers popstate/hashchange event.
               // This event will be processed by handler set above.
            }
            else
            {
               // for ie9
               
               logger.trace('reloading: history.back()');
               $window.history.back(); // sync?
               // Go to BACK record to not accumulate BACK records in history on each reload.
               
               logger.trace('reloading: location.replace', _baseUrl);
               $window.location.replace(_baseUrl);
               // Note that we use _baseUrl (without hash) here
               // to prevent current location to be used as deeplink after reload.
            }
         };
         
         /////////////////////////////////////////////////////////////////////////
         
      }]
   });

});
