define(['module', 'underscore', 'swServiceFactory'], function(module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swSubmachine', '$timeout', 'swUserInputBlockerRegistry',
         function(swSubmachine, $timeout, swUserInputBlockerRegistry) {
            var isThisEditor = false,
                self = this,
                $element,
                isToolbarInverted,
                toolbarVisibilityTimer,
                isToolbarFixed,
                TOOLBAR_DELAY_MS = 5000;

            this.setIsEditor = function(isEditor)
            {
               if('string' === typeof(isEditor)){
                  isEditor = isEditor.toLowerCase() === 'true';
               }
               isThisEditor = isEditor;
            };

            this.isEditor = function()  //TODO: Move functionality in a more suitable place
            {
               return isThisEditor;
            };

            this.getCurrentAppName = function()
            {
               return isThisEditor ? 'Editor' : '';
            };

            this.getModuleName = function() {
               return swSubmachine.getStack()[0].module.name;
            };

            this.canHideToolbar    = _.constant(false);
            this.setCanHideToolbarFn = function setCanHideToolbarFn(fnc) {
               this.canHideToolbar = fnc || _.constant(false);
            };

            this.isFromClassEntered = function() {
               return _.some(swSubmachine.getStack(), function (stackEl) {
                  return _.get(stackEl.confParams(), '_classId', false);
               });
            };

            this.isReadingState = function (){
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].currState === 'Reading';
            };

            this.isPortalState = function (){
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].module.name === 'AppPortal';
            };

            this.isAdminState = function (){
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].module.name === 'AppAdmin';
            };

            this.setToolbarElement = function (el) {
               $element = el;
            };

            this.toggleToolbar = function () {
               if (_isReadingMode()) {
                  _setInvertToolbar(!isToolbarInverted);
                  // fix 1638#13
                  self.hideToolbarDelayed();
               }
               else if (_isBlockedContent()) {
                  self.showToolbarImmidiatly();
                  _checkIfNeededHideToolbar();
               }
            };

            this.isReader = function ()
            {
               var state = swSubmachine.getStack().length && swSubmachine.getStack()[0].currState;
               return state === 'Reading' && !self.isEditor();
            };

            function _isReadingMode() {
               return self.isReader() && !_isBlockedContent();
            }

            function _isBlockedContent() {
               return swUserInputBlockerRegistry.isElementBlocked($element);
            }

            function _checkIfNeededHideToolbar() {
               if (_isBlockedContent()) {
                  _.delay(_checkIfNeededHideToolbar, 100);
               }
               else if (_isReadingMode()) {
                  self.hideToolbarDelayed();
               }
            }

            this.showToolbarImmidiatly = function () {
               _setInvertToolbar(false);
            };

            this.hideToolbarDelayed = function () {
               if (isToolbarInverted === false) {
                  _runNewTimer(self.hideToolbarImmidiatly);
               }
            };

            this.hideToolbarImmidiatly = function () {
               if (_isReadingMode()) {
                  _setInvertToolbar(true);
               }
            };

            function _clearPreviousTimer() {
               if (toolbarVisibilityTimer) {
                  $timeout.cancel(toolbarVisibilityTimer);
                  toolbarVisibilityTimer = 0;
               }
            }

            function _runNewTimer(fnc) {
               _clearPreviousTimer();

               if (_isReadingMode()) {
                  toolbarVisibilityTimer = $timeout(fnc, TOOLBAR_DELAY_MS);
               }
            }

            function _setInvertToolbar(toolbarInverted) {
               _clearPreviousTimer();
               isToolbarInverted = toolbarInverted && self.canHideToolbar();
               self.onApplicationToolbarToggle(isToolbarInverted);
            }

            var listeners = [];
            this.onApplicationToolbarToggle = function () {
               _.each(listeners, _.method('apply', null, arguments));
            };

            this.addOnApplicationToolbarToggleListener = function (listener) {
               listeners = _.union(listeners, [listener]);
            };

            this.removeOnApplicationToolbarToggleListener = function (listener) {
               _.pull(listeners, listener);
            };

            this.setToolbarFixed = function (_isFixed) {
               isToolbarFixed = Boolean(_isFixed);
            };

            this.isToolbarFixed = function () {
              return isToolbarFixed;
            };
      }]
   });
});