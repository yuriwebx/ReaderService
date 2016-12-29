define([
   'module',
   'swComponentFactory',
   'underscore',
   'text!./ApplicationToolbar.html',
   'less!./ApplicationToolbar.less'
], function(module, swComponentFactory, _, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      controller : [
         'swApplicationToolbarService',
         'swPopupService',
         'swUserService',
         'swLayoutManager',
      function(
         swApplicationToolbarService,
         swPopupService,
         swUserService,
         swLayoutManager,

         /* jshint unused: true */
         swComponentAugmenter,
         $scope,
         $element
      ) {

         var vm =  $scope;
         var menuPopup;
         /* --- api --- */
         vm.currentAppName = '';
         vm.toggleMenu     = toggleMenu;
         vm.toggleToolbar  = swApplicationToolbarService.toggleToolbar;

         vm.showToolbar    = swApplicationToolbarService.showToolbarImmidiatly;
         vm.hideToolbar    = swApplicationToolbarService.hideToolbarDelayed;
         vm.hideMenuButton = function () {
            var user = swUserService.getUser() || {};
            return _.negate(swUserService.isAuthenticated) && (!user.active || user.active === 'Registered');
         };
         vm.loggedIn       = swUserService.isAuthenticated;
         vm.loggedOut      = swUserService.isLoggedOut;

         $scope.MainMenuTooltip = {
            text: 'ApplicationMenuItem.MainMenu.tooltip',
            layout: {
               my: 'CT',
               at: 'CB',
               margin: {
                  left: 5,
                  top: 10,
                  right: 5,
                  bottom: 10
               },
               collision: {rotate: false}
            }
         };


         /* === impl === */
         $scope.swInit     = swInit;
         $scope.swDestroy  = swDestroy;

         function swDestroy() {
            swLayoutManager.unregister($scope.$id);
            swApplicationToolbarService.removeOnApplicationToolbarToggleListener(_changeToolbarVisibility);
         }

         function swInit() {
            swApplicationToolbarService.setToolbarElement($element);
            swApplicationToolbarService.addOnApplicationToolbarToggleListener(_changeToolbarVisibility);
            $scope.$on('SubmachineStateChanged', _onSubmachineChanged);
            swLayoutManager.register({
               id: $scope.$id,
               layout: _layout
            });
         }

         function _layout(ctx) {
            var funcs = [];
            if((ctx.events.resizing || ctx.events.orienting) && menuPopup){
               menuPopup.hide();
            }
            if (ctx.events.resizing) {
               funcs.push(_blinkToolbarVisibility);
            }
            if (ctx.events.hideToolbar) {
               funcs.push(swApplicationToolbarService.hideToolbarImmidiatly);
            }
            if (ctx.events.showToolbar) {
               funcs.push(swApplicationToolbarService.showToolbarImmidiatly);
            }
            if (funcs.length && swApplicationToolbarService.isReader()) {
               $scope.$apply(_.flow.apply(_, funcs));
            }
         }

         function _blinkToolbarVisibility() {
            // show toolbar immediately
            swApplicationToolbarService.showToolbarImmidiatly();
            // hide toolbar with delay (inside)
            swApplicationToolbarService.hideToolbarDelayed();
         }

         function _onSubmachineChanged() {
            if (swApplicationToolbarService.isReader()) {
               swApplicationToolbarService.hideToolbarDelayed();
            }
            else {
               swApplicationToolbarService.showToolbarImmidiatly();
            }
            vm.currentAppName = swApplicationToolbarService.getCurrentAppName();
         }

         function toggleMenu($event)
         {
            var element = $event.target;

            if (!menuPopup || !menuPopup.show) {
                menuPopup = swPopupService.show({
                    template: '<sw-application-menu></sw-application-menu>',
                    backdropVisible: true,
                    customClass: 'push-dialog',
                    pushMode: true,
                    layout: getLayouter(element),
                    isCashPopup: true,
                });
            } else {
                menuPopup.show();
            }
            return menuPopup;
         }

         function getLayouter(elem) {
            return function() {
               return {
                  margin: {
                     top: 50
                  },
                  of: {
                     clientRect: elem.getClientRects()[0]
                  },
                  my: 'LT',
                  at: 'LB',
                  arrow: true
               };
            };
         }

         

         function _changeToolbarVisibility(isHide) {
            vm.isToolbarInverted = isHide;
         }

      }]
   });
});
