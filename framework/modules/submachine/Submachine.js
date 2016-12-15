/**
 * Submachine is a Finite-State Machine (http://en.wikipedia.org/wiki/Finite_State_Machine)
 * implementation. The main design goal for this implementation is the minimization
 * of declarative approach in client coding. Plain js should be used to program
 * application behavior as much as possible.
 *
 * In contrast to known FSM implementations, to achieve the above-mentioned design
 * goal, Submachine does not maintain predefined sets of possible events, states,
 * and transitions. It just provides the client programmer with simple API intended
 * to send/process events and to make/process transitions. The processing of events
 * and transitions is performed via callback functions which client programmer
 * specifies using naming convention.
 *
 * Hierarchical (parent-child) relationship of submachines is supported in the
 * following way. When component (see ComponentFactory) is created then it creates
 * and holds on its $scope its own instance of Submachine. These instances are
 * organized into stack (static property of Submachine). When child submachine ends
 * then it removes itself from the stack and sends appropriate event to its parent.
 * If there are child submachines when state in parent submachine is going to be
 * changed then Submachine interrupts children first starting from the deepest one.
 *
 * Submachine API:
 *
 *    static
 *    createInstance(componentModule, componentScope)
 *       - create Submachine instance
 *       - register this instance on componentScope as property named 'swSubmachine'
 *       - return this instance
 *       This method is not intended to be used in business code,
 *       it should be used in infrastructure code that creates Submachine instance
 *
 *    static
 *    event(event, params)
 *       - invoke event(event, params) on the deepest submachine in stack
 *
 *    static
 *    deeplink(path, event)
 *       - invoke event(event) if event is specified
 *       - process deeplink (see 'configure()', 'start()' below)
 *
 *    static
 *    back()
 *       - invoke back() on the deepest child
 *       - the same action is performed when "swLocation" service
 *         broadcasts "back" event 
 *
 *    static
 *    getStack()
 *       - return full stack of Submachines as an array of 'contexts'
 *         (see method 'context()' below)
 *
 *    static
 *    interruptRoughly()
 *       - roughly interrupt all Submachines in stack from the deepest to root
 *         (submachines are interrupted regardless $on$interrupt callback)
 *
 *    configure(config, configOptions)
 *       - provide information how to process deeplink for this Submachine instance.
 *       
 *          "config" parameter structure:
 *          {
 *             state1name: {
 *                uri: 'uriPartText',   // mandatory
 *                start:   false,       // optional
 *                history: true,        // optional
 *                params: [             // optional
 *                   name: 'paramName', // mandatory
 *                   optional: false,   // optional
 *                   array:    false,   // optional
 *                ]
 *                getParams: function()
 *                   - return current param values from $scope
 *                setParams: function(<params parsed from url>)
 *                   - map params to $scope
 *                   - perform appropriate actions to process params
 *                   - wait for promises (if any), then invoke 'go'; return 'false' or nothing
 *                     or return 'true' to go to this state immediately
 *             },
 *             state2name: {...},
 *             state3name: {...}
 *          }
 *          
 *          "configOptions" parameter structure:
 *          {
 *             customStart: false       // optional 
 *          }
 *          
 *          If "config.history" is not specified (or specified as "true")
 *             then this state replaces current record in history.
 *          If "config.history" is specified as "false"
 *             then this state is ignored in history.
 *
 *          On submachine initialization (see _init(), start() below):
 *          - if some state in "config" is specified with "start: true" then
 *             - process deeplink part if any,
 *             - otherwise "go" to this state 
 *          - if "configOptions.customStart" is specified then do nothing:
 *             - programmer should invoke start() when appropriate.
 *               Assumed that this is specific UC which needs to do some
 *               transitions before deeplink processing
 *               (for example, perform login actions).
 *               In such a case business code must invoke 'start()' (see below)
 *               when it is ready to process deeplink.
 *          - otherwise just process deeplink part (if any) without transition
 *                    
 *          
 *          See examples in application code.
 *          
 *
 *    _init()
 *       - push this instance to stack
 *       - invoke scope.swInit() if specified
 *       - transit to special technical state '$start'
 *       - process deeplink part according to configuration (see above)
 *       This method is not intended to be used in business code,
 *       it should be used in infrastructure code that creates
 *       Submachine instance
 *
 *    _destroy()
 *       This method is not intended to be used in business code,
 *       it should be used in infrastructure code that creates
 *       Submachine instance
 *
 *    start(state, params)
 *       - if application is launched with deeplink then extract state and params
 *         from current uri part and invoke 'go()' (see below).
 *       - otherwise just invoke 'go' with specified arguments.
 *       This method is intended for use in specific UCs which
 *       needs to do some transitions before deeplink processing
 *       (for example, perform login actions).
 *       In such a case business code must invoke this method
 *       when it is ready to process deeplink
 *       (see "configOptions.customStart" above).
 *
 *    event(event, params)
 *       - put params to context
 *          (deep copy is used -> submachine does not keep reference to specified params),
 *       - invoke appropriate callbacks
 *
 *    go(state, params)
 *       - interrupt children if any,
 *       - merge params with params in context,
 *          (deep copy is used -> submachine does not keep reference to specified params),
 *       - invoke appropriate callbacks.
 *
 *    end(event, params)
 *       - transit to special technical state '$end',
 *       - pop this instance from stack,
 *       - send specified event (with params) to parent
 *
 *    reload()
 *       - force transition to current state: go(<currentstate>)
 *       
 *    back()
 *       - invoke "back" callbacks (see below)
 *       - if callbacks not specified or return "false" then propagate to parent
 *
 *    state()
 *       - return current state
 *
 *    state(state)
 *       - return true if current state equals to specified state
 *
 *    context()
 *       - return Submachine execution context
 *          submachine, // reference to this Submachine instance
 *          module,
 *          event,
 *          prevState,
 *          currState,
 *          nextState,
 *          params,
 *          parent: function() // return parentSubmachine.context() or 'undefined'
 *          child:  function() // return  childSubmachine.context() or 'undefined'
 *          confParams: function()
 *             // return configuration params this Submachine was started with
 *             // (see configure#getParams)
 *
 *
 * Callbacks:
 *
 * If methods with the following signatures are specified on the Submachine
 * instance they will be invoked at appropriate moments:
 *
 *    $scope.swSubmachine.$on<State>$<event>()    // <event> got in <State>
 *    $scope.swSubmachine.$on<State>$leave<()     // <State> is being left
 *    $scope.swSubmachine.$on<State>$enter()      // <State> is being entered
 *    $scope.swSubmachine.$on<State1>$<State2>()  // transition from <State1> to <State2> is being performed
 *    $scope.swSubmachine.$onBeforeAnyEvent()
 *    $scope.swSubmachine.$onAfterAnyEvent()
 *    $scope.swSubmachine.$onBeforeAnyTransition()
 *    $scope.swSubmachine.$onAfterAnyTransition()
 *
 *    $scope.swSubmachine.$on$interrupt()
 *       - invoked if any transition in parent Submachine is requested.
 *       - return
 *          - boolean that means 'canBeInterrupted'
 *          - promise that is resolved to boolean
 *          - 'undefined' is treated as 'true'
 *
 *    $scope.swSubmachine.$on<State>$back()
 *    $scope.swSubmachine.$onAnyState$back()
 *       - see "back()" above
 *       - return
 *          - boolean that means 'stopPropagation'
 *          - promise that is resolved to boolean
 *          - 'undefined' is treated as 'true'
 *
 * Broadcasting:
 *
 *    $rootScope.$broadcast('SubmachineStateChanging', context)
 *       Submachine invokes it before any transition
 *
 *    $rootScope.$broadcast('SubmachineStateChanged', context)
 *       Submachine invokes it after any transition
 *
 *    $rootScope.$broadcast('SubmachineEventTriggering', context)
 *       Submachine invokes it before any event processing
 *
 *    $rootScope.$broadcast('SubmachineEventTriggered', context)
 *       Submachine invokes it after any event processed
 *
 *
 * Listening:
 *
 *    scope.$on('swBeforeDestroy', promiseHolder)
 *       Client code should broadcast this event before destroying the scope
 *       to smoothly interrupt child Submachines. For example:
 *
 *           var promiseHolder = { promise: $q.when(true) };
 *           scope.$broadcast('swBeforeDestroy', promiseHolder);
 *           promiseHolder.promise.then(function(destroyConfirmed)
 *           {
 *              if ( destroyConfirmed )
 *              {
 *                 scope.$destroy();
 *              }
 *           });
 *
 *
 * Please see below the sequence diagram.
 * It begins from 'event()' invocation somewhere in client code.
 * Then 'go()' is invoked in appropriate event processing callback.
 * Please note that it's not mandatory to use 'event()' to control Submachine.
 * Client programmer can use 'go()' directly from UI-event callback.
 *
 * event(event, params) invoked ->
 *    context.params = merge(context.params, deep-copy-of-params)
 *    context.event = event
 *    $broadcast('SubmachineEventTriggering')
 *    $onBeforeAnyEvent()
 *    $on<state>$<event> -> go(state, params) invoked in this callback ->
 *       context.params = merge(context.params, deep-copy-of-params)
 *       context.nextState = state
 *       $broadcast('SubmachineStateChanging')
 *       $onBeforeAnyTransition()
 *       $on<currState>$leave()
 *       $on<currState>$<nextState>()
 *       $on<nextState>$enter()
 *       $onAfterAnyTransition()
 *       context.prevState = context.currState
 *       context.currState = context.nextState
 *       context.nextState = null
 *       $broadcast('SubmachineStateChanged')
 *    $onAfterAnyEvent()
 *    $broadcast('SubmachineEventTriggered')
 *
 */
define([

   'module',
   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'swAppUrl'

   ], function(

   module,
   _,
   ng,
   ngModule,
   swLoggerFactory,
   swAppUrl

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ////////////////////////////////////////////////////////////////////////////

   ngModule.factory('swSubmachine', [
           'swStack', '$rootScope', '$timeout', '$q', 'swLocation', 'swUserInputBlockerRegistry',
   function(swStack,   $rootScope,   $timeout,   $q,   swLocation,   swUserInputBlockerRegistry )
   {
      logger.trace('register');
      
      /////////////////////////////////////////////////////////////////////////
      // private static
      
      var stack = swStack.createInstance();
      
      /////////////////////////////////////////////////////////////////////////
      
      var _startPath = swAppUrl.fragment;
      logger.debug('startPath', _startPath);
      
      /////////////////////////////////////////////////////////////////////////
      
      var _currPath;
      function _setPath(path)
      {
         swLocation.setPath(path);
         _currPath = path;
      }
      
      _setPath('/');
      
      /////////////////////////////////////////////////////////////////////////
      
      var _deeplink; // for logging and error messages
      var _deeplinkParts = [];
      
      /////////////////////////////////////////////////////////////////////////
      
      // Initialize swLocation when all startup activity is finished
      var _checkStartup = _.debounce(function()
      {
         _checkStartup = _.noop; // only once
         swLocation.init();
      }, 500);
                  
      /////////////////////////////////////////////////////////////////////////
      
      $rootScope.$on('swLocationChange', function(event, data)
      {
         /*jshint unused:true */
         
         if ( swUserInputBlockerRegistry.isHistoryBlocked() )
         {
            logger.debug('swLocationChange', data, 'rejected: user input blocked');
         }
         else
         {
            logger.debug('swLocationChange', data);
            if ( data.back )
            {
               Submachine.back();
            }
            else if ( data.path )
            {
               Submachine.deeplink(data.path);
            }
         }
      });
                        
      /////////////////////////////////////////////////////////////////////////
      
      var Submachine = function(componentScope)
      {
         var _this = this;
         
         var _scope = componentScope;
         _scope.swSubmachine = this;
         
         var loggerName = module.id + ':' + _scope.module.name + ':' + _scope.$id;
         var logger = swLoggerFactory.getLogger(loggerName);
         
         var _basePath = _currPath;
         logger.debug('started', _basePath);
         
         var _configured;
         var _config = {};
         var _configReverse = {};
         var _configOptions = {};
         
         var _children = {};
         
         var _event;
         var _prevState;
         var _currState;
         var _nextState;
         var _params;
         
         var _going = false;
         var _interrupting = false;
         
         var _stackLen = stack.len();
         // remember stack size at startup so that we could know
         // whether parent/child Submachines exist
         
         // public (see comments in the header)
         this.configure = function(config, configOptions)
         {
            logger.trace('configure');
            _configured = true;
            _config = config;
            _.each(config, function(value, key)
            {
               value.state = key;
               _configReverse[value.uri] = value;
            });
            
            _configOptions = configOptions || {};
         };
         
         // public (see comments in the header)
         this._init = function()
         {
            _checkStartup();
            
            stack.push(this);
            
            // clear context
            _event     = null;
            _prevState = null;
            _currState = null;
            _nextState = null;
            _params    = null;

            _basePath  = _currPath;
            
            var parent = stack.byIndex(_stackLen - 1);
            if ( parent )
            {
               parent._registerChild(_scope);
            }
            
            if ( _.isFunction(_scope.swInit) )
            {
               _scope.swInit();
            }
            
            __go('$start');
            
            if ( _configured )
            {
               var startStateConfig = _.findWhere(_config, {start: true});
               if ( startStateConfig )
               {
                  logger.trace('"start" state configured:', startStateConfig.state);
                  this.start(startStateConfig.state);
               }
               else if ( _configOptions.customStart )
               {
                  logger.trace('"customStart" mode configured: programmer should invoke start() when appropriate');
               }
               else
               {
                  logger.trace('neither "start" state nor "customStart" mode was configured: just process deeplink without transition');
                  _processDeeplink();
               }
            }
            else
            {
               logger.trace('submachine not configured: no history/deeplink processing will be performed');
            }
         };

         // see comments in the header ('Listening' chapter)
         _scope.$on('swBeforeDestroy', function(event, promiseHolder)
         {
            // we need to process only the first encountered child submachine
            // as the first child submachine will do all the necessary work:
            //    parent.interruptChildren()

            if ( !event.defaultPrevented )
            {
               logger.trace('swBeforeDestroy');
               event.defaultPrevented = true;
               var parent = stack.byIndex(_stackLen - 1);
               if ( parent )
               {
                  promiseHolder.promise = parent._interruptChildren();
               }
            }
         });

         // public (see comments in the header)
         this._destroy = function()
         {
            var parent = stack.byIndex(_stackLen - 1);
            if ( parent )
            {
               parent._destroyChild(_scope);
            }
         };

         // this method is NOT intended to be used in client code
         this._registerChild = function(childScope)
         {
            childScope.$swParentSubmachineState = _currState;
            _children[childScope.$swParentSubmachineState] = childScope;
            logger.trace('register child', childScope.$id, 'in state', childScope.$swParentSubmachineState);
         };
         
         // this method is NOT intended to be used in client code
         this._destroyChild = function(childScope)
         {
            _children[childScope.$swParentSubmachineState] = undefined;
            logger.trace('destroy child', childScope.$id, 'in state', childScope.$swParentSubmachineState);
         };
         
         // public (see comments in the header)
         this.start = function(state, params)
         {
            logger.trace('start');
            if ( !_processDeeplink() )
            {
               this.go(state, params);
            }
         };
         
         // public (see comments in the header)
         this.context = function()
         {
            return {
               submachine: this,
               scope: _scope,
               module: ng.copy(_scope.module),
               event: _event,
               prevState: _prevState,
               currState: _currState,
               nextState: _nextState,
               params: _params || {},
               confParams: function()
               {
                  var parent = stack.byIndex(_stackLen - 1);
                  return ng.copy((parent && parent._getConfParams()) || {});
               },
               parent: function()
               {
                  var s = stack.byIndex(_stackLen - 1);
                  return s && s.context();
               },
               child: function()
               {
                  var s = stack.byIndex(_stackLen + 1);
                  return s && s.context();
               }
            };
         };
         
         // public (see comments in the header)
         this.state = function()
         {
            return arguments.length === 0 ? _currState : _currState === arguments[0];
         };
         
         function _checkEnded()
         {
            if ( _currState === '$end' )
            {
               logger.warn('activity in "$end" state');
            }
         }
         
         // public (see comments in the header)
         this.event = function(event, params)
         {
            _checkStartup();
            
            logger.debug('event', event, 'in state', _currState);
            _checkEnded();
            _mergeParams(params);
            _event = event;
            $rootScope.$broadcast('SubmachineEventTriggering', _this.context());
            _invokeEventCallbacks();
            $rootScope.$broadcast('SubmachineEventTriggered', _this.context());
         };
         
         // public (see comments in the header)
         this.go = function(state, params)
         {
            _checkStartup();
            
            return this._interruptChildren().then(function(interrupted)
            {
               if ( interrupted )
               {
                  _go(state, params);
               }
            });
         };
         
         function _go(state, params)
         {
            if ( _going )
            {
               // if 'go' is invoked in 'go' processing callback,
               // then hold it until current 'go' is finished.
               $timeout(function()
               {
                  __go(state, params);
               });
               return;
            }
            
            _going = true;
            __go(state, params);
            _going = false;
         }
         
         function __go(state, params)
         {
            logger.debug('go', _currState, '->', state);
            _checkEnded();
            _mergeParams(params);
            _nextState = state;
            $rootScope.$broadcast('SubmachineStateChanging', _this.context());
            _invokeTransitionCallbacks();
            _prevState = _currState;
            _currState = _nextState;
            _nextState = null;
            $rootScope.$broadcast('SubmachineStateChanged',  _this.context());
            _updateLocation();
            
            var childScope = _children[_currState];
            if ( childScope )
            {
               // Falling here means that child component, started previously
               // when this submachine enters this state, was not destroyed.
               // It might occur if, for example, this submachine did some
               // transition(s) which did not have visual presentation and
               // eventually returned to this state. In such a case component
               // is not re-created/re-initialized (see ComponentFactory 'postLink'
               // processing) and so we have to re-initialize it manually.
               // Important particular case: simply 'go' to the same state.
               logger.trace('restart child', childScope.$id, 'in state', _currState);
               childScope.swSubmachine._init();
            }
         }
         
         // public (see comments in the header)
         this.end = function(event, params)
         {
            logger.debug('end', event, 'in state', _currState);
            _checkEnded();
            _mergeParams(params);
            _event = event;
            return this.go('$end').then(function()
            {
               stack.pop();
               logger.debug('ended');
               stack.peek().event(event, params); // send event to parent
            });
         };
         
         // public (see comments in the header)
         this.reload = function()
         {
            logger.debug('reload in state', _currState);
            return this.go(_currState);
         };
         
         // Return promise that resolved to boolean that means
         // 'childrenInterrupted/childrenCannotBeInterrupted'
         // (this method is NOT intended to be used in client code)
         this._interruptChildren = function()
         {
            var res = $q.when(true);
            if ( stack.len() > _stackLen + 1 ) // has children?
            {
               logger.debug(_currState, 'interruption starting');
               _interrupting = true; // mark this submachine as interruption initiator
               res = stack.peek()._canBeInterrupted().then(function(canBeInterrupted) // check the deepest child
               {
                  if ( canBeInterrupted )
                  {
                     stack.peek()._interrupt(); // start interruption from the deepest child
                  }
                  _interrupting = false;
                  logger.debug(_currState, 'interruption', canBeInterrupted ? 'ended' : 'rejected');
                  return canBeInterrupted;
               });
            }
            return res;
         };
         
         // Interrupt children regardless '$on$interrupt' callback.
         // (this method is NOT intended to be used in client code)
         this._interruptChildrenRoughly = function()
         {
            if ( stack.len() > _stackLen + 1 ) // has children?
            {
               logger.debug(_currState, 'forced interruption starting');
               _interrupting = true; // mark this submachine as interruption initiator
               stack.peek()._interrupt(); // start interruption from the deepest child
               _interrupting = false;
               logger.debug(_currState, 'forced interruption ended');
            }
         };
         
         // Check if this Submachine can be interrupted and if so then
         // continue checking up to the one that initiated interruption.
         // Return promise that resolved to boolean that means 'canBeInterrupted'.
         // (this method is NOT intended to be used in client code)
         this._canBeInterrupted = function()
         {
            var promise = $q.when(true);
            if ( !_interrupting )
            {
               promise = $q.when(_invoke('$interrupt')).then(function(canBeInterrupted)
               {
                  // 'undefined' treated as 'true'
                  canBeInterrupted = _.isBoolean(canBeInterrupted) ? canBeInterrupted : true;
                  if ( canBeInterrupted )
                  {
                     var parent = stack.byIndex(_stackLen - 1);
                     canBeInterrupted = parent._canBeInterrupted();
                  }
                  return canBeInterrupted;
               });
            }
            return promise;
         };
         
         // Interrupt this Submachine and continue interruption
         // up to the one that initiated interruption
         // (this method is NOT intended to be used in client code)
         this._interrupt = function()
         {
            if ( !_interrupting )
            {
               _event = 'interrupted';
               _go('$end');
               stack.pop();
               logger.debug('interrupted');
               stack.peek()._interrupt(); // interrupt parent
            }
         };
         
         // If "back" callback is not specified or return "false" then
         // propagate "back" to parent
         this.back = function()
         {
            logger.debug('back');
            
            var result = _invoke(_currState + '$back', true) || _invoke('AnyState$back', true);
            $q.when(result).then(function(result)
            {
               if ( !result )
               {
                  var parent = stack.byIndex(_stackLen - 1);
                  if ( parent )
                  {
                     parent.back();
                  }
               }
            });
         };
         
         function _mergeParams(params)
         {
            _params = ng.extend(_params||{}, ng.copy(params));
         }
         
         function _invokeEventCallbacks()
         {
            _invoke('BeforeAnyEvent');
            _invoke(_currState + '$' + _event);
            _invoke('AfterAnyEvent');
         }
         
         function _invokeTransitionCallbacks()
         {
            _invoke('BeforeAnyTransition');
            _invoke(_currState + '$leave');
            _invoke(_currState + '$' + _nextState);
            _invoke(_nextState + '$enter');
            _invoke('AfterAnyTransition');
         }
         
         function _invoke(callback, def)
         {
            var name = '$on' + callback;
            var f = _this[name];
            if ( ng.isFunction(f) )
            {
               logger.trace(_currState, name);
               var res = f.apply(_this);
               return _.isUndefined(res) ? def : res;
            }
         }
         
         // This method is NOT intended to be used in client code
         // See this.context.confParams()
         this._getConfParams = function()
         {
            var params = {};
            var stateConf = _config[_currState];
            if ( stateConf && _.isFunction(stateConf.getParams) )
            {
               params = stateConf.getParams() || {};
               logger.trace('getParams', stateConf.state, params);
               
               _.each(stateConf.params, function(param)
               {
                  var value = params[param.name];
                  if ( _.isUndefined(value) || _.isNull(value) )
                  {
                     if ( !param.optional )
                     {
                        throw new Error(loggerName + ': incorrect deeplink mandatory param value: ' + param.name);
                     }
                  }
                  else
                  {
                     var ap = !param.array;
                     var av = !_.isArray(value);
                     if ( ap !== av )
                     {
                        throw new Error(loggerName + ': incorrect deeplink array param value: ' + param.name);
                     }
                  }
               });
            }
            return params;
         };
         
         function _updateLocation()
         {
            var stateConf = _config[_currState];
            if ( !stateConf || stateConf.history === false )
            {
               _setPath(_basePath);
               return;
            }
            
            var parts = [];
            
            if ( _basePath !== '/' )
            {
               parts.push(_basePath);
            }
            
            parts.push(stateConf.uri);

            var params = _this._getConfParams();
            _.each(stateConf.params, function(param)
            {
               var value = params[param.name];
               if ( value )
               {
                  if ( _.isArray(value) )
                  {
                     _.each(value, function(v)
                     {
                        parts.push(param.name);
                        parts.push(v);
                     });
                  }
                  else
                  {
                     parts.push(param.name);
                     parts.push(value);
                  }
               }
            });
            
            var path = parts.join('/');
            if ( path.indexOf('/') !== 0 )
            {
               path = '/' + path;
            }
            
            _setPath(path);
         }
         
         function _processDeeplink()
         {
            var p = _this._parseDeeplinkPart();
            if ( p )
            {
               _this._processDeeplinkPart(p);
            }
            return !!p;
         }
         
         // This method is NOT intended to be used in client code
         this._parseDeeplinkPart = function()
         {
            try
            {
               return _parseDeeplinkPartWithDetailedErrorMessage();
            }
            catch ( e )
            {
               logger.fatal(e.message);
               throw new Error('Incorrect deeplink');
            }
         };
         
         function _parseDeeplinkPartWithDetailedErrorMessage()
         {
            var uri = _deeplinkParts.shift();
            if ( !uri )
            {
               return;
            }
            
            var stateConf = _configReverse[uri];
            if ( !stateConf )
            {
               throw new Error(loggerName + ': incorrect deeplink: unknown uri part: ' + uri + ' - ' + _deeplink);
            }
               
            var params = {};
            _.each(stateConf.params, function(param)
            {
               var avalue = [];
               while ( true )
               {
                  var name = _deeplinkParts.shift();
                  if ( name !== param.name )
                  {
                     if ( name )
                     {
                        _deeplinkParts.unshift(name);
                     }
                     if ( param.optional || avalue.length > 0 )
                     {
                        break;
                     }
                     else
                     {
                        throw new Error(loggerName + ': incorrect deeplink: mandatory param not found: ' + param.name + ' - ' + _deeplink);
                     }
                  }
                  
                  var value = _deeplinkParts.shift();
                  if ( !value )
                  {
                     throw new Error(loggerName + ': incorrect deeplink: param value not specified: ' + param.name + ' - ' + _deeplink);
                  }
                  
                  avalue.push(value);
               }
               
               if ( avalue.length > 0 )
               {
                  if ( !param.array && avalue.length > 1 )
                  {
                     throw new Error(loggerName + ': incorrect deeplink: more than one param value specified for non array param: ' +
                                     param.name + ' - ' + _deeplink);
                  }
                  params[param.name] = param.array ? avalue : avalue[0];
               }
            });
            
            logger.trace('parseDeeplinkPart', stateConf.uri, '->', stateConf.state, params);
            return {
               stateConf: stateConf,
               state: stateConf.state,
               params: params
            };
         }
         
         // This method is NOT intended to be used in client code
         this._processDeeplinkPart = function(p)
         {
            logger.trace('processDeeplinkPart', p.state, p.params);
            var shouldGo = true;
            if ( _.isFunction(p.stateConf.setParams) )
            {
               logger.trace('setParams', p.params);
               shouldGo = p.stateConf.setParams(p.params);
            }
            if ( shouldGo )
            {
               _this.go(p.state);
            }
         };
         
         // This method is NOT intended to be used in client code
         this._getDeeplinkPart = function()
         {
            var conf = _config[_currState];
            var params = conf && conf.getParams ? conf.getParams() : {};
            logger.trace('getDeeplinkPart', _currState, params);
            return {
               state: _currState,
               params: params
            };
         };
         
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.createInstance = function(componentScope)
      {
         return new Submachine(componentScope);
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.getStack = function()
      {
         var s = [];
         for ( var i = 0; i < stack.len(); i++ )
         {
            s.push(stack.byIndex(i).context());
         }
         return s;
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.deeplink = function(path, event)
      {
         if ( event )
         {
            Submachine.event(event);
         }
         
         if ( path.indexOf('/') !== 0 )
         {
            path = '/' + path;
         }
         
         _deeplink = path;
         logger.debug('deeplink:', _deeplink);
         
         if ( path === '/' )
         {
            _deeplinkParts = [];
            var root = stack.byIndex(0);
            if ( root )
            {
               logger.trace('deeplink: reload root');
               root.reload();
            }
            return;
         }
         
         _deeplinkParts = path.split('/');
         _deeplinkParts.shift(); // since path starts with '/' we have to skip 1st empty part
         
         for ( var i = 0; ; i++ )
         {
            if ( _deeplinkParts.length === 0 )
            {
               var psm = stack.byIndex(i - 1);
               if ( psm )
               {
                  logger.trace('deeplink: reload previous');
                  psm.reload();
               }
               break;
            }
            
            var sm = stack.byIndex(i);
            if ( !sm )
            {
               logger.trace('deeplink: no submachines in stack');
               break;
            }
            
            var c = sm.  _getDeeplinkPart();
            var p = sm._parseDeeplinkPart();
            if ( c.state !== p.state || !_.isEqual(c.params, p.params) )
            {
               logger.trace('deeplink: process');
               sm._processDeeplinkPart(p);
               break;
            }
         }
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.event = function(event, params)
      {
         var current = stack.peek();
         if ( current )
         {
            current.event(event, params);
         }
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.back = function()
      {
         var current = stack.peek();
         if ( current )
         {
            current.back();
         }
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      // public static (see comments in the header)
      Submachine.interruptRoughly = function()
      {
         var root = stack.byIndex(0);
         if ( root )
         {
            root._interruptChildrenRoughly();
         }
      };
      
      /////////////////////////////////////////////////////////////////////////
      
      if ( _startPath !== '' && _startPath !== '/' )
      {
         // application was launched with deeplink
         Submachine.deeplink(_startPath);
      }
      
      /////////////////////////////////////////////////////////////////////////
                    
      return Submachine;
   
   }]);

});
