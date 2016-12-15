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
      service: ['$timeout', 'swUserInputBlockerRegistry', function($timeout, swUserInputBlockerRegistry)
      {
         var _this = this;
         
         var _modifiers = [ 'alt', 'ctrl', 'shift' ];
         
         var _keys = {
            backspace:  8,
            tab:        9,
            clear:     12,
            enter:     13,
            esc:       27,
            space:     32,
            pageup:    33,
            pagedown:  34,
            end:       35,
            home:      36,
            left:      37,
            up:        38,
            right:     39,
            down:      40,
            insert:    45,
            del:       46,
            
            f1: 112, f2: 113, f3: 114, f4:  115, f5:  116, f6:  117,
            f7: 118, f8: 119, f9: 120, f10: 121, f11: 122, f12: 123
            
         };
         
         // digits
         for (var i0 = 48; i0 < 58; i0++ )
         {
            _keys[String.fromCharCode(i0).toLowerCase()] = i0;
         }
         
         // letters
         for (var ia = 65; ia < 91; ia++ )
         {
            _keys[String.fromCharCode(ia).toLowerCase()] = ia;
         }
         
         /**
          * Bind key events handler to specified element.
          *
          * 'keyComboListAndBindToClosestToCallbackMap' - key to callback function mapping
          *    'keyComboListAndBindToClosest' structure is specified in HotKey.js
          *
          *   For example:
          * 
          *   var keys = {
          *      'left':  function() { incr(); };
          *      'right': function() { decr(); };
          *   }
          *   swHotKeyService.bind($element, keys);
          * 
          */
         this.bind = function(element, keyComboListAndBindToClosestToCallbackMap)
         {
            var keysOnElement = [];

            _.each(keyComboListAndBindToClosestToCallbackMap, function(callback, keyComboListAndBindToClosest)
            {
               var a = keyComboListAndBindToClosest.split('|');
               var keyComboList  = a[0];
               var bindToClosest = a[1];
               
               var keys = _parseKeyComboList(keyComboList, callback);
               
               if ( bindToClosest )
               {
                  // if "sw-hot-key" is applied to element that is added to DOM
                  // via "ng-if" or "sw-render" then we have to perform binding
                  // next tick when DOM structure is consistent. 
                  $timeout(function()
                  {
                     var closest = element.closest(bindToClosest);
                     if ( closest.length === 0 )
                     {
                        throw new Error('swHotKeyService: no closest element found for: ' + bindToClosest);
                     }
                     
                     _this.logger.trace('on ', bindToClosest, keys);
                     var handler = _createHandler(element, keys);

                     closest.on('keydown', handler);
                     element.on('$destroy', function()
                     {
                        _this.logger.trace('off', bindToClosest, keys);
                        closest.off('keydown', handler);
                     });
                  }, 0, false);
               }
               else
               {
                  keysOnElement = keysOnElement.concat(keys);
               }

            });

            if ( keysOnElement.length > 0 )
            {
               _this.logger.trace('on', keysOnElement);
               element.on('keydown', _createHandler(element, keysOnElement));
            }
         };

         function _parseKeyComboList(keyComboList, callback)
         {
            var keys = [];

            _.each(keyComboList.split(','), function(keyCombo)
            {
               var key = {
                  callback: callback
               };
               
               var keyName = keyCombo.trim().toLowerCase();
               
               _.each(_modifiers, function(m)
               {
                  if ( keyName.indexOf(m + '+') !== -1 )
                  {
                     keyName = keyName.replace(m + '+', '');
                     key[m] = true;
                  }
               });
               
               key.name = keyName;
               key.code = _keys[keyName];
               if ( !key.code )
               {
                  throw new Error('swHotKeyService: unknown key: ' + keyCombo);
               }
               
               keys.push(key);
            });

            return keys;
         }

         function _createHandler(element, keys)
         {
            return function(event)
            {
               if ( swUserInputBlockerRegistry.isElementBlocked(element[0]) )
               {
                  _this.logger.trace('skip blocked', keys);
                  return;
               }
               
               if ( !element.is(':visible') )
               {
                  if ( _this.logger.isTraceEnabled() )
                  {
                     _this.logger.trace('skip invisible', event.keyCode, element[0].className);
                  }
                  return;
               }
               
               _.any(keys, function(key)
               {
                  if ( event.keyCode === key.code )
                  {
                     var allModifiers = _.all(_modifiers, function(m)
                     {
                        var e = !event[m + 'Key'];
                        var k = !key[m];
                        return e === k;
                     });

                     if ( allModifiers )
                     {
                        var localScope = {key: _.omit(key, 'callback')};
                        
                        _this.logger.trace('callback', localScope);
                        
                        event.target = element[0];
                        // change target to mimic that event was triggered
                        // on the element where this directive is specified 

                        localScope.$event = event;
                        
                        key.callback(localScope);
                        
                        event.preventDefault();
                        event.stopPropagation();
                        
                        return true; // finish 'any'
                     }
                  }
               });
            };
         }
         
      }]
   });

});
