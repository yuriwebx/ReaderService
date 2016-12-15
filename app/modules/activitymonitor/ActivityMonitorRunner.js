define([
   'module',
   'underscore',
   'jquery',
   'Context',
   'ngModule',
   'swLoggerFactory'
], function(module, _, $, Context, ngModule, swLoggerFactory) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var _run = [
      '$rootScope',
      '$window',
      'swSubmachine',
      'swApplicationScroll',
      'swNotificationService',
      'swUserService',
      'swApplicationToolbarService',
      'swActivityMonitorService',
      ActivityMonitorRunner
   ];

   ngModule.run(_run);

   function ActivityMonitorRunner(
      $rootScope,
      $window,
      swSubmachine,
      swApplicationScroll,
      swNotificationService,
      swUserService,
      swApplicationToolbarService,
      swActivityMonitorService
   ) {

      logger.trace('run');

      var activities       = [],
          _activitySetter  = _createObservable('ApplicationSessionStatus.ActivityUsers'),
          _onlineSetter    = _createObservable('ApplicationSessionStatus.Online'),
          _setInactive     = _.partial(_onlineSetter, false),
          onlineAtom       = _setInactive(),
          activityAtom     = _activitySetter([]),
          $document        = $($window),
          setTimeout       = $window.setTimeout,
          clearTimeout     = $window.clearTimeout,
          _userInactivityTimer   = 0,
          userInactivityTimeout  = Context.parameters.ActivityMonitorParameters.userInactivityTimeout,
          _cancelLoginWatcher    = $rootScope.$watch(swUserService.isAuthenticated, _onAuth);

      swActivityMonitorService.setOnline(onlineAtom);
      swActivityMonitorService.setActivityUsersList(activityAtom);

      swNotificationService.addNotificationListener('activitymonitor', _activityGetter, setActivity);

      function setActivity (data) {
         _activitySetter(data);
         swActivityMonitorService.onActivityMonitorSet(data);
      }

      $rootScope.$on('SubmachineStateChanged', function() {
         var rootCase = _.first(swSubmachine.getStack()) || {};
         var params = _.reduce(swSubmachine.getStack(), _paramReducer, {});
         var classId = params.classId || params._classId;

         var _r = new UserActivity('Book Reading', params._id);
         var _c = new UserActivity('Class', classId);
         var _g = new UserActivity('Study Guide Editing', params._id);

         switch(rootCase.currState) {
         case 'Reading':
            activities = swApplicationToolbarService.isEditor() ? [_g] : [_r, _c];
            break;
         case 'ManageStudyClass':
            activities = [_c];
            break;
         default:
            activities = [];
         }

         activities = _.filter(activities, _.property('relatedEntityId'));
      });

      $document.on('mousedown keydown touchstart', _resetUserInactivityTimer);
      // application scroll
      swApplicationScroll.addListener(_resetUserInactivityTimer);
      // back/forward/history user activity
      $rootScope.$on('swLocationChange', _resetUserInactivityTimer);

      function _resetUserInactivityTimer() {
         _onlineSetter(true);
         clearTimeout(_userInactivityTimer);
         _userInactivityTimer = setTimeout(_setInactive, userInactivityTimeout);
      }

      function _activityGetter() {
         return {
            online      : onlineAtom.get(),
            activities  : activities
         };
      }

      function _onAuth(isLoggedIn) {
         _onlineSetter(isLoggedIn);

         if (isLoggedIn) {
            _cancelLoginWatcher();
            _resetUserInactivityTimer();
         }
      }

      function _paramReducer(memo, submachine) {
         return _.extend(memo, submachine.confParams());
      }
   }

   function UserActivity(name, relatedEntityId) {
      this.name = name;
      this.relatedEntityId = relatedEntityId;
   }

   function _createObservable(name, _comparator) {
      var listeners     = [],
          value         = null,
          atom          = new Observable();

      _comparator = _comparator || _.isEqual;

      return function setter(val) {
         if (!_comparator(val, value)) {
            logger.debug(name, 'changing from: ', value, ' to: ', val);
            value = val;
            _onChange();
         }
         return atom;
      };

      function Observable() {
         this.on  = on;
         this.get = get;
         this.off = off;
      }

      function on(listener) {
         listeners.push(listener);
      }

      function off(listener) {
         listeners = _.remove(listeners, function _removePredicate(_listener) {
            return listener === _listener;
         });
      }

      function get() {
         return value;
      }

      function _onChange() {
         _.each(listeners, _.method('call', null, value));
      }
   }
});
