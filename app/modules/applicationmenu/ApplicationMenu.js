define([
   'module',
   'swComponentFactory',
   'text!./ApplicationMenu.html',
   'less!./ApplicationMenu.less',
   'less!./ApplicationMenuMixin.less'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      controller: ['$scope', 'swApplicationMenuService', 'swUserService', 'swProfileService',
         function ($scope, swApplicationMenuService, swUserService, swProfileService) {

            $scope.swInit = function() {
               $scope.menuSections = swApplicationMenuService.getAllMenuSections();
            };

            $scope.selectMenuItem = function(menuItem) {
                $scope.logger.trace('onMenuItemSelected', menuItem);
                return swApplicationMenuService.selectMenuItem(menuItem);
            };

            $scope.isMenuItemVisible = function(menuItem) {
               return swApplicationMenuService.isMenuItemVisible(menuItem);
            };

            $scope.getMenuItemLocalizedName = function(menuItem) {
               return swApplicationMenuService.getMenuItemLocalizedName(menuItem);
            };

            $scope.isUserLoggedIn = function() {
               return swUserService.isAuthenticated();
            };

             $scope.isUserInfoVisible = function() {
                 return $scope.isUserLoggedIn();
             };

            $scope.$watch($scope.isUserLoggedIn, function(isLoggedIn) {
               if (isLoggedIn)
               {
                  $scope.userProfile = swProfileService.getProfile();
               }
               else
               {
                  $scope.userProfile = {};
               }
            });

         }]
   });
});