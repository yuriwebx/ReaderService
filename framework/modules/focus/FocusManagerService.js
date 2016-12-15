/**
 * FocusManager is a hierarchical infrastructure that controls
 * keyboard focus processing.
 * 
 * FocusManager can be attached to any container DOM element
 * 
 * - programmatically:
 *  
 *      swFocusManagerService.createInstance(model, $scope, $element);
 *      
 * - declaratively:
 * 
 *      <div sw-focus-manager="model-expr">
 * 
 * Model is an object with the following properties:
 * 
 *    root (boolean, default: false)
 *       if 'true' then this FocusManager is considered as independent:
 *          - no parent
 *          - not a child of DOM ancestor FocusManager
 *    
 *    cycle (boolean, default: true)
 *       Focus is cycled inside this container traversing all tabbable children.
 *       
 *    traverse (boolean, default: false)
 *       When parent decides to focus this element:
 *       - if 'traverse' is 'false' then first|last (depending on direction)
 *         child is focused,
 *       - if 'traverse' is 'true' then, at first, this element is focused as a whole,
 *         and then, on next tab, first|last child is focused
 *    
 *    traverseEmpty (boolean, default: false)
 *       If 'true' then this element is focused as a whole even if it does not
 *       contain any focusable children.
 *    
 *    keyNext (string, default: 'tab')
 *    keyPrev (string, default: 'shift+tab')
 *       Key combination list for tabbing.
 *       Specified in format compatible with 'keyComboList' parameter of swHotKey
 *    
 *    default (string, default: see 'defaultPolicy' below)
 *    first   (string, default: first focusable child)
 *    last    (string, default: last  focusable child)
 *       Expression treated as selector (relative to this element) for child that
 *       should be focused by default|first|last.
 *       Could be specified alternatively by one the following attributes on appropriate child:
 *          sw-focus-default
 *          sw-focus-first
 *          sw-focus-last
 *    
 *    defaultPolicy (boolean, default: inherited from parent FocusManager, 'true' for root)
 *       Defines the behavior when default child is not specified:
 *          true:  first child is focused
 *          false:     nothing is focused
 *    
 *    id (optional, string, default: sequence number)
 *       used for tracing only to identify which manager this trace record from
 *
 *         
 * FocusManager supports "standard" html "tabindex" attribute.
 * Negative value means that element does not take part in "tab" traversing.
 * 
 */
define([

   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory',
   'less!./FocusManagerService'

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
   
   ngModule.factory('swFocusManagerService', [
                                              
      '$window',
      '$q',
      '$rootScope',
      'swFeatureDetector',
      'swUtil',
      'swScrollFactory',
      'swHotKeyService',
      
   function(
         
       $window,
       $q,
       $rootScope,
       swFeatureDetector,
       swUtil,
       swScrollFactory,
       swHotKeyService
       
   )
   {
      logger.trace('register');

      /////////////////////////////////////////////////////////////////////////
      
      var NAME_CLASS = 'sw-focus-manager';
      var NAME_DATA  = NAME_CLASS;
      
      var TABBABLE_NODE_NAMES = ['input', 'button', 'select', 'textarea']; // <a> with tabindex only
      var NAME_ATTR_DEFAULT = 'sw-focus-default';
      var NAME_ATTR_FIRST   = 'sw-focus-first';
      var NAME_ATTR_LAST    = 'sw-focus-last';
      
      var _serial = 0;
      var _roots = [];
      var _activeElement;
      
      /////////////////////////////////////////////////////////////////////////
      
      function _isActive()
      {
         return swFeatureDetector.canRequestFocus();
      }
      
      /////////////////////////////////////////////////////////////////////////
      
      function _isFocusManager($elem)
      {
         return $elem.hasClass(NAME_CLASS);
      }
      
      function _getFocusManager($elem)
      {
         $elem = $elem || $('.' + NAME_CLASS + ':first');
         return $elem.data(NAME_DATA);
      }
      
      function _forEachFocusManager(callback)
      {
         _.each($('.' + NAME_CLASS), function(elem)
         {
            callback($(elem).data(NAME_DATA));
         });
      }
      
      function _getParentFocusManager($elem)
      {
         return $elem.parents('.' + NAME_CLASS + ':first').data(NAME_DATA);
      }
      
      function _getClosestFocusManager($elem)
      {
         return $elem.closest('.' + NAME_CLASS).data(NAME_DATA);
      }
      
      function _getTopRootFocusManager()
      {
         return _.last(_roots) || _getFocusManager();
      }

      function _isInTopRootFocusManager(elem)
      {
         var closest = _getClosestFocusManager($(elem));
         if ( closest )
         {
            var root = _getTopRootFocusManager();
            for ( var fm = closest; fm; fm = fm.parent() )
            {
               if ( fm === root )
               {
                  return true;
               }
            }
         }
         return false;
      }

      function _isTabbable($elem)
      {
         if ( !$elem.is(':visible') || $elem.attr('disabled') === 'disabled' )
         {
            return false;
         }
         
         if ( _isFocusManager($elem) )
         {
            return true;
         }
         
         var tabindex = $elem.attr('tabindex');
         if ( tabindex >= 0 )
         {
            return true;
         }
         
         var nodeName = $elem[0].nodeName.toLowerCase();
         var input = _.includes(TABBABLE_NODE_NAMES, nodeName);
         return input && isNaN(tabindex);
      }
      
      function _isFocusable($elem)
      {
         if ( !$elem.is(':visible') || $elem.attr('disabled') === 'disabled' )
         {
            return false;
         }
         
         if ( _isFocusManager($elem) && _getFocusManager($elem).isRoot() )
         {
            return false;
         }
         
         var tabindex = $elem.attr('tabindex');
         if ( tabindex >= 0 )
         {
            return true;
         }
         
         var nodeName = $elem[0].nodeName.toLowerCase();
         var input = _.includes(TABBABLE_NODE_NAMES, nodeName);
         return input;
      }
      
      function _sync()
      {
         var focusManager = _getClosestFocusManager($(_activeElement));
         if ( focusManager )
         {
            focusManager._sync(_activeElement);
         }
      }
      
      function _toggleFocusClass(elem, flag)
      {
         _getWrapper(elem).toggleClass('sw-focus', flag);
      }
      
      function _getWrapper(elem)
      {
         var $elem = $(elem);
         var $wrapper = $elem.closest('.' + NAME_CLASS + ', .sw-input-wrapper');
         return $wrapper.length === 0 || $wrapper.hasClass(NAME_CLASS) ? $elem : $wrapper;
      }
      
      /////////////////////////////////////////////////////////////////////////
      
      if ( _isActive() )
      {
         $($window.document).on('focusout', function(event)
         {
            if ( logger.isDebugEnabled() )
            {
               logger.debug('focusout', event.target.className);
            }
            _toggleFocusClass(event.target, false);
            _notIdle();
         });
               
         $($window.document).on('focusin', function(event)
         {
            var elem = event.target;
            
            // In Chrome, when browser control element (address bar, for example)
            // is focused and user presses Tab -> the first focusable element
            // in DOM is focused. But we need the topmost root FocusManager to be focused.
            if ( _isInTopRootFocusManager(elem) )
            {
               // the rules whether element is tabbable are
               // slightly different in different browsers,
               // and also in this FocusManager. So we process
               // "focusin" event only for "compatible" elements.
               if ( _isFocusable($(elem)) )
               {
                  if ( logger.isDebugEnabled() )
                  {
                     logger.debug('focusin:', elem.className);
                  }

                  _toggleFocusClass(elem, true);
                  _activeElement = elem;
                  _sync();

                  _.defer(function()
                  {
                     swScrollFactory.scrollIntoViewIfNeeded(elem, true);
                  });
               }
               else
               {
                  if ( logger.isDebugEnabled() )
                  {
                     logger.debug('focusin: skip non-focusable:', elem.className);
                  }
               }
            }
            else
            {
               if ( logger.isDebugEnabled() )
               {
                  logger.debug('focusin: skip non-root:', elem.className);
               }
            }
            
            _notIdle();
            
            return false; // preventDefault/stopPropagation
         });
         
         $($window.document).on('keydown', function(event)
         {
            if ( event.keyCode === 9 ) // tab
            {
               // falling here means that user presses TAB while
               // current focused element is not inside any FocusManager
               
               _restoreFocus(_activeElement, 'DefaultTabHandler', true);
               
               return false; // preventDefault/stopPropagation
            }
         });
         
         $rootScope.$watch(function()
         {
            logger.trace('digest');
            
            // Reset all FocusManagers to ensure refresh after any change
            _forEachFocusManager(function(fm)
            {
               fm.reset();
            });
            
            _notIdle();
         });
         
      } // isActive
      
      /////////////////////////////////////////////////////////////////////////
      
      function _createInstance(model, $scope, $element)
      {
         var _this;
         var _logger;
         var _model;
         var _tabbables;
         var _index;
         var _first;
         var _last;
         var _default;
         var _defaultPolicy;
         var _focusing;
         
         function FocusManager()
         {
            _this = this;
            
            _model = _.defaults(model, {
               id: _serial++,
               root: false,
               cycle: true,
               traverse: false,
               traverseEmpty: false,
               keyNext: 'tab',
               keyPrev: 'shift+tab'
            });
            
            _logger = _getLogger(); // _model should be already prepared
            _logger.trace('create', _model);
            
            if ( _model.root )
            {
               _roots.push(_this);
               $element.on('$destroy', function()
               {
                  _logger.trace('destroy', _model);
                  _roots = _.without(_roots, _this);
               });
            }
            
            $element.data(NAME_DATA, this);
            $element.addClass(NAME_CLASS);
            
            if ( (_model.traverse || _model.traverseEmpty) && !$element.attr('tabindex') )
            {
               $element.attr('tabindex', 0);
            }
            
            _configureKeys();
            
            _defaultPolicy = this._defaultPolicy();
         }
         
         FocusManager.prototype.isRoot = function()
         {
            return _model.root;
         };
         
         FocusManager.prototype.parent = function()
         {
            return _parent();
         };
         
         FocusManager.prototype.reset = function()
         {
            // ensure refreshing (see _getTabbables() below)
            _logger.trace('reset');
            _tabbables = undefined;
         };
         
         FocusManager.prototype.focus = function(delta)
         {
            _index = undefined;
            return this._focus(delta);
         };
         
         FocusManager.prototype._focus = function(delta)
         {
            _logger.debug('focus:', delta, _index);
            
            if ( _focusing && _getTabbables().length === 0 )
            {
               _logger.debug('focus: recursion');
               return false;
            }
            
            var res;
            _focusing = true;
            
            if ( _model.traverse )
            {
               _logger.debug('traverse');
               _index = undefined;
               _focusElement($element);
               res = true;
            }
            else
            {
               res = _focusInc(delta);
               if ( !res && _model.traverseEmpty )
               {
                  _logger.debug('traverseEmpty');
                  _index = undefined;
                  _focusElement($element);
                  res = true;
               }
            }
            
            _focusing = false;
            return res;
         };
         
         // Synchronize _index
         // In particular, needed when user sets focus manually
         FocusManager.prototype._sync = function(elem)
         {
            _logger.trace('sync1', elem.className);
            
            var found;
            
            _index = undefined;
            
            if ( elem === $element[0] )
            {
               found = 'container';
            }
            else
            {
               _.some(_getTabbables(), function(t, i)
               {
                  if ( elem === t[0] )
                  {
                     _index = i;
                     found = 'child ' + i;
                     return true;
                  }
               });
            }
            
            if ( found )
            {
               var p = _parent();
               if ( p )
               {
                  p._sync($element[0]);
               }
            }
            
            _logger.trace('sync2', found || 'not found');
         };
         
         FocusManager.prototype._defaultPolicy = function()
         {
            var res = _model.defaultPolicy;
            if ( _.isUndefined(res) )
            {
               var p = _parent();
               if ( p )
               {
                  res = p._defaultPolicy();
               }
            }
            if ( _.isUndefined(res) )
            {
               res = true;
            }
            _logger.trace('defaultPolicy', res);
            return res;
         };
         
         function _parent()
         {
            return !_model.root && _getParentFocusManager($element);
         }
         
         function _setAttrBySelector(attrName, selectorExpr)
         {
            if ( selectorExpr )
            {
               $element.find('.sw-focus-attr[' + attrName + ']')
                  .removeClass('sw-focus-attr')
                  .removeAttr(attrName);

               var selector = $scope.$eval(selectorExpr);
               var $elem = $element.find(selector);
               var log = $elem.length === 1 ? 'trace' : 'warn';
               _logger[log](attrName, ':', selectorExpr, ':', selector, ': found', $elem.length);
               $elem.first()
                  .addClass('sw-focus-attr')
                  .attr(attrName, '');
            }
         }
         
         function _getTabbables()
         {
            if ( !_tabbables )
            {
               _tabbables = _collectTabbables();
               if ( !_.isUndefined(_index) )
               {
                  _sync();
               }
            }
            return _tabbables;
         }
         
         function _collectTabbables()
         {
            var t1 = swUtil.now();
            
            var tabbables = [];
            
            _setAttrBySelector(NAME_ATTR_FIRST,   _model.first  );
            _setAttrBySelector(NAME_ATTR_LAST,    _model.last   );
            _setAttrBySelector(NAME_ATTR_DEFAULT, _model.default);
            
            _first   = undefined;
            _last    = undefined;
            _default = undefined;
            
            __collectTabbables($element.children(), tabbables);
            
            if ( tabbables.length > 0 )
            {
               _first   = _.isUndefined(_first  ) ? 0 : _first;
               _last    = _.isUndefined(_last   ) ? tabbables.length - 1 : _last;
               _default = _.isUndefined(_default) && _defaultPolicy ? _first : _default;
               _logger.trace('collect: first/last/default', _first, _last, _default);
            }
            
            tabbables = _.sortBy(tabbables, function(t)
            {
               var tabindex = +t.attr('tabindex');
               return isNaN(tabindex) ? 0 : tabindex;
            });
            
            var t2 = swUtil.now();
            _logger.debug('collect:', tabbables.length, '-', t2 - t1, 'ms');
            return tabbables;
         }
         
         function __collectTabbables($elems, tabbables)
         {
            _.each($elems, function(elem)
            {
               var $elem = $(elem);
               if ( _isTabbable($elem) )
               {
                  _processTabbable($elem, tabbables);
               }
               else
               {
                  __collectTabbables($elem.children(), tabbables);
               }
            });
         }
         
         function _processTabbable($elem, tabbables)
         {
            var index = tabbables.length;
            
            if ( _logger.isTraceEnabled() )
            {
               _logger.trace('processTabbable', index, $elem[0].className);
            }
            
            if ( !_.isUndefined($elem.attr(NAME_ATTR_FIRST)) )
            {
               _first = index;
            }
            if ( !_.isUndefined($elem.attr(NAME_ATTR_LAST)) )
            {
               _last = index;
            }
            if ( !_.isUndefined($elem.attr(NAME_ATTR_DEFAULT)) )
            {
               _default = index;
            }
            
            tabbables.push($elem);
         }
         
         function _configureKeys()
         {
            var keys = {};
            keys[_model.keyNext] = function() { _focusInc( 1); };
            keys[_model.keyPrev] = function() { _focusInc(-1); };
            swHotKeyService.bind($element, keys);
            
            // "space" key on radio buttons should move focus to next tabbable
            $element.on('keydown', '[type=radio]', function(event)
            {
               if ( event.keyCode === 32 ) // space
               {
                  _logger.trace('radio: space');
                  event.stopPropagation();
                  _whenIdle('radio-space-focus-next').then(function()
                  {
                     _logger.trace('radio: focusInc(1)');
                     _focusInc(1);
                  });
               }
            });
         }
         
         function _focusInc(delta)
         {
            _logger.debug('focusInc:', delta, _index);
            
            var len = _getTabbables().length;
            if ( len === 0 )
            {
               return _focusParent(delta);
            }
               
            delta = _.isUndefined(delta) ? 0 : delta;
            if ( _.isUndefined(_index) )
            {
               switch ( delta )
               {
                  case  0: _index = _default; break;
                  case  1: _index = _first;   break;
                  case -1: _index = _last;    break;
                  default: throw new Error('FocusManager: internal error: delta =' + delta);
               }
               return _focusChild(delta);
            }
            
            var out = false;
            if ( _index === _last  && delta ===  1 )
            {
               _index = _first;
               out = true;
            }
            else if ( _index === _first && delta === -1 )
            {
               _index = _last;
               out = true;
            }
            else
            {
               _index += delta;
               if ( _index < 0 )
               {
                  _index = len - 1;
               }
               if ( _index >= len )
               {
                  _index = 0;
               }
            }
            
            if ( !_model.cycle && out )
            {
               return _focusParent(delta);
            }
            else
            {
               return _focusChild(delta);
            }
         }
         
         function _focusParent(delta)
         {
            var p = _parent();
            if ( p )
            {
               _logger.debug('focusParent:', delta);
               return p._focus(delta);
            }
            else
            {
               _logger.debug('focusParent: no parent:', delta);
               return _focusChild(delta);
            }
         }
         
         function _focusChild(delta)
         {
            if ( _.isUndefined(_index) )
            {
               _logger.debug('focusChild: no default child');
               return false;
            }
            
            var $elem = _getTabbables()[_index];
            if ( $elem )
            {
               _logger.debug('focusChild:', delta, _index);
               if ( _isFocusManager($elem) )
               {
                  return _getFocusManager($elem).focus(delta);
               }
               else
               {
                  _focusElement($elem);
                  return true;
               }
            }
            else
            {
               _logger.debug('focusChild: no child', _index);
               return false;
            }
         }
         
         function _focusElement($elem)
         {
            if ( _logger.isDebugEnabled() )
            {
               _logger.debug('focusElement:', _index, $elem[0].className);
            }
            $elem.focus();
         }
         
         function _getLogger()
         {
            var loggerName = module.id;
            if ( $scope.module )
            {
               loggerName += ':' + $scope.module.name;
            }
            loggerName += ':' + $scope.$id + ':' + _model.id;
            return swLoggerFactory.getLogger(loggerName);
         }
         
         FocusManager.prototype._id = function()
         {
            return ($scope.module ? $scope.module.name : '') + $scope.$id;
         };
         
         return new FocusManager();
         
      } // _createInstance
   
      /////////////////////////////////////////////////////////////////////////
      
      var _idleMonitors = [];
      
      var _notIdle = function()
      {
         _.invoke(_idleMonitors, Function.prototype.call);
      };
      
      function _whenIdle(id, delay)
      {
         return $q(function(resolve)
         {
            logger.trace('whenIdle', id, 'queued');
            
            var idleMonitor = _.debounce(function()
            {
               logger.trace('whenIdle', id, 'resolved');
               
               resolve();
               _idleMonitors = _.without(_idleMonitors, idleMonitor);
               
            }, delay || 200);
            
            idleMonitor();
            _idleMonitors.push(idleMonitor);
         });
      }
      
      /////////////////////////////////////////////////////////////////////////
      
      function _saveFocus(requestorId)
      {
         if ( !_isActive() )
         {
            return _.noop;
         }
         else
         {
            var a = _activeElement;
            if ( logger.isDebugEnabled() )
            {
               logger.debug('saveFocus', requestorId, a && a.className);
            }
            return function restoreFocus()
            {
               _restoreFocus(a, requestorId, false);
            };
         }
      }
      
      function _restoreFocus(element, requestorId, forceFocusIfNotInView)
      {
         if ( logger.isDebugEnabled() )
         {
            logger.debug('restoreFocus', requestorId || '', element && element.className);
         }
         
         if ( element && $(element).is(':visible') )
         {
            // _getWrapper is used as some inputs (checkboxes, for example) are designed
            // to be greater then wrapper (to be better tappable on small touch devices) and
            // so fail the test scroll.isElementVisible().
            if ( forceFocusIfNotInView || swScrollFactory.getParentScroll($(element)).isElementVisible(_getWrapper(element)) )
            {
               $(element).focus();
            }
            else
            {
               _activeElement = element;
            }
         }
         else
         {
            if ( forceFocusIfNotInView )
            {
               _requestDefaultFocus();
            }
            else
            {
               _activeElement = null;
            }
         }
      }
      
      /////////////////////////////////////////////////////////////////////////
      
      var _requestDefaultFocusDebounced = _.debounce(function()
      {
         var focusManager = _getTopRootFocusManager();
         if ( focusManager )
         {
            logger.debug('requestDefaultFocus', focusManager._id());
            focusManager.focus();
         }
         
         _notIdle();

      }, 300);
      
      function _requestDefaultFocus()
      {
         if ( _isActive() )
         {
            logger.debug('requestDefaultFocus queued');
            _requestDefaultFocusDebounced();
         }
      }
      
      /////////////////////////////////////////////////////////////////////////
      
      return {

         /**
          * Attach FocusManager to specified element
          */
         createInstance: function(model, $scope, $element)
         {
            return _isActive() ? _createInstance(model, $scope, $element) : null;
         },
         
         /**
          * Return "restoreFocus" function that remembers current focused element.
          * Note that if remembered element is not visible (scrolled out of user view)
          * at the moment when "restoreFocus" is invoked then it is not actually
          * focused to avoid scrolling but "remembered" to be focused next Tab pressing.   
          */
         saveFocus: function(requestorId)
         {
            return _saveFocus(requestorId);
         },
         
         /**
          * Focus default child of the topmost root FocusManager.
          * Requests are queued until there are no focus operations whithin
          * previous 200ms.
          */
         requestDefaultFocus: function()
         {
            return _requestDefaultFocus();
         },

         /**
          * Get the closest FocusManager for the specified element and set focus in it
          * to the default/next/previous (delta: 0/1/-1) tabbable child.
          */
         setFocus: function($elem, delta)
         {
            var fm = _getClosestFocusManager($elem);
            if ( fm )
            {
               fm._focus(delta);
            }
         },

         /**
          * Return promise to be resolved when there were no focus operations whithin
          * previous "delay" (200ms by default).
          * "id" is used for logging only.
          */
         whenIdle: function(id, delay)
         {
            return _whenIdle(id, delay);
         }

      };

      /////////////////////////////////////////////////////////////////////////
      
   }]);
   
});
