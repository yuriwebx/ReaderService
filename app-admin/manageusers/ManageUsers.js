define([
   'swComponentFactory',
   'module',
   'Context',
   'underscore',
   'text!./ManageUsers.html',
   'text!./ManageUsersMenu.html',
   'less!./ManageUsers'

], function (swComponentFactory, module, Context, _, template, manageUsersMenuTemplate) {

   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      controller : [
         '$scope',
         'swAdminUserService',
         'swManageUserProfileService',
         '$timeout',
         'swPopupService',
         'swUserService',
         function (
            $scope,
            swAdminUserService,
            swManageUserProfileService,
            $timeout,
            swPopupService,
            swUserService) {
            var vm      = $scope;
            var manageUsersMenu;

            vm.deletedProfiles = {};
            vm.category        = void(0);
            vm.categories      = void(0);
            vm.filterModel     = {filter : ''};
            vm.itemsCount      = 0;
            vm.itemsCountStep  = 20;
            vm.total           = 0;
            vm.profiles        = [];
            vm.hideMoreButton  = false;

            vm.swInit              = _init;
            vm.addUser             = addUser;
            vm.edit                = edit;
            vm.showDelete          = showDelete;
            vm.deleteUser          = deleteUser;
            vm.switchCategory      = switchCategory;
            vm.more                = more;
            vm.openManageUsersMenu = openManageUsersMenu;
            vm.acceptUser          = acceptUser;
            vm.declineUser         = declineUser;
            vm.sendEmail           = sendEmail;

            vm.manageUsersMenuTemplate = manageUsersMenuTemplate;

            function _init () {
               vm.categories = swAdminUserService.getUserCategories();
               vm.category = vm.categories[0].type;
               vm.switchCatVal = 0;
               vm.more();
            }

            function addUser () {
               openProfileManager();
            }

            function edit (profileView) {
               openProfileManager(profileView.id);
            }

            function showDelete (profile) {
               return !Context.parameters.isPublic && (!profile.email || profile.email.indexOf('@irls') === -1) && profile.active !== 'Registered';
            }

            function deleteUser (userId) {
               $timeout(function () {
                  vm.deletedProfiles[userId] = true;
               });
               swAdminUserService.deleteUser(userId).catch(function () {
                  $timeout(function () {
                     vm.deletedProfiles[userId] = false;
                  });
               });
            }

            function afterSave () {
               vm.doFilter();
            }

            function openProfileManager (userId) {
               swManageUserProfileService.showUserProfilePopup('Admin', userId).then(function () {
                  afterSave();
               });
            }

            function switchCategory (category, index) {
               vm.category = category;
               vm.switchCatVal = index;
               vm.itemsCount = 0;
               vm.more();
            }

            vm.doFilter = function (callback) {
               swAdminUserService.searchUsers(vm.category, vm.filterModel.filter, vm.itemsCount)
                  .then(function (result) {
                     vm.profiles = result.result;
                     vm.total = result.total;
                     vm.hideMoreButton = vm.total < vm.itemsCount;
                     _.each(vm.profiles, function (profile) {
                        profile.photoLink = _.has(profile, 'photo.fileHash') ? swUserService.getUserPhoto(profile.photo.fileHash) : '';
                     });
                     if (callback && typeof(callback) === "function") {
                        callback();
                     }
                  });
            };

            function more () {
               vm.itemsCount += vm.itemsCountStep;
               vm.doFilter();
            }

            function openManageUsersMenu (_ev) {
               var popupConfig;
               if ( !manageUsersMenu || manageUsersMenu.isHidden() ) {
                  popupConfig = {
                     template        : manageUsersMenuTemplate,
                     scope           : vm,
                     backdropVisible : true,
                     customClass     : 'admin-category-select-list',
                     layout : {
                        of: {
                           clientRect: _ev && _ev.currentTarget.getClientRects()[0]
                        },
                        my: 'RT',
                        at: 'RB',
                        arrow: true
                     }
                  };
                  manageUsersMenu = swPopupService.show(popupConfig);
               }
               return manageUsersMenu;
            }

            function acceptUser (userId) {
               confirmUserAccess(userId, true).then(_accept);
               function _accept () {
                  //accept user
               }
            }

            function declineUser (userId) {
               confirmUserAccess(userId, false).then(_decline);
               function _decline () {
                  //decline user
               }
            }

            function sendEmail (/*userId*/) {
               //sendEmail to user
            }

            function confirmUserAccess (userId, confirm) {
               return swAdminUserService.confirmUserAccess(userId, confirm)
                  .then(function () {
                     _.remove(vm.profiles, {_id: userId});
                  });
            }

            vm.categorySelectOptions = {
               multiple : false,
               data : vm.categories,
               swObjectToItem : function (o) {
                  return {
                     id : o,
                     text : o
                  };
               }
            };

         }
      ]
   });
});

