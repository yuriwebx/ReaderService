define([

   'module',
   'swServiceFactory',
   'text!./ManageUserProfile-header.html',
   'less!./ManageUserProfile'

   ], function(

   module,
   swServiceFactory,
   templateHeader

   ){

   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swPopupService', 'swUserService', '$rootScope', '$q',
         function (swPopupService, swUserService, $rootScope, $q) {

            this.showUserProfilePopup = function (mode, userId) {
               var defer = $q.defer();
               var popup, $scope = $rootScope.$new();
               
               $scope.userId = mode === 'Personal' ? swUserService.getUserId() : userId;
               $scope.mode = mode;
               /* jshint ignore:start */
               $scope.config = {
                  hideFn: function () {
                     popup && popup.hide();
                     defer.resolve();
                  }
               };
               /* jshint ignore:end */
               popup = swPopupService.show({
                  layout: {},
                  backdropVisible: true,
                  modal: true,
                  customClass: 'manageUserProfile defaultPopup',
                  scope: $scope,
                  header: templateHeader,
                  content: '<sw-manage-user-profile user-id="{{userId}}" config="config" mode="{{mode}}" update-popup-layout="updatePopupLayout()"></sw-manage-user-profile>'
               });

               $scope.updatePopupLayout = popup.layout;

               return defer.promise;
            };
            
         }]
   });
});