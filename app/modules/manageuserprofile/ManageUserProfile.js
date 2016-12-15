define([
   'swComponentFactory',
   'module',
   'underscore',
   'text!./ManageUserProfile-content.html'
], function (swComponentFactory, module, _, template) {

   'use strict';
   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         userId : '@',
         config : '=',
         mode   : '@',
         updatePopupLayout: '&'
      },
      controller: [
         '$window',
         '$scope',
         'swUserService',
         'swValidationService',
         '$q',
         'swManageTestsService',
         '$timeout',
         function (
            $window,
            $scope,
            swUserService,
            swValidationService,
            $q,
            swManageTestsService,
            $timeout
         ) {
            var vm = $scope;
            var fileType    = '';
            var blobDefault = {};
            var oldPhoto    = {};

            vm.isImageUploaded = false;
            vm.isImageEmpty    = true;
            vm.isSelectImgView = false;
            vm.isDeactivated   = false;
            vm.cropped = {
               startImg  : '',
               resultImg : ''
            };
            vm.config = _.extend(vm.config, {
               cancel          : cancel,
               save            : save,
               back            : back,
               useSelection    : useSelection,
               isSelectImgView : function () {
                  return vm.isSelectImgView;
               }
            });

            vm.swInit                       = _init;
            vm.passwordSwitcher             = passwordSwitcher;
            vm.adminRoleSwitcher            = adminRoleSwitcher;
            vm.editorRoleSwitcher           = editorRoleSwitcher;
            vm.activeSwitcher               = activeSwitcher;
            vm.showOldPassword              = showOldPassword;
            vm.isNewUser                    = isNewUser;
            vm.validateName                 = validateName;
            vm.validateCurrentPassword      = validateCurrentPassword;
            vm.validateEmail                = validateEmail;
            vm.validateNewPassword          = validateNewPassword;
            vm.validateConfirmationPassword = validateConfirmationPassword;
            vm.togglePasswordDropDown       = togglePasswordDropDown;
            vm.toggleStatisticsDropDown     = toggleStatisticsDropDown;
            vm.setSelectImgView             = setSelectImgView;
            vm.setImgPreview                = setImgPreview;

            function _init () {
               vm.profilePersistingInfo = {
                  newUser                    : false,
                  passwordPersistingModeEnum : 'WithoutChanges',
                  passwordConfirmation       : '',
                  newPassword                : ''
               };
               vm.newPasswordConfirmation = '';

               if ( vm.userId ) {
                  swUserService.getUserProfileState(vm.userId)
                     .then(function (profileInfo) {
                        vm.profileStatus         = profileInfo.userProfileStatus;
                        vm.userStudyStatistics   = profileInfo.userStudyStatistics;
                        vm.profile               = profileInfo.userProfileInfo;
                        vm.showConfirmationBlock = vm.profileStatus.hasNotConfirmedEmail;
                        oldPhoto                 = vm.profile.photo;
                        init();
                     });
               }
               else {
                  vm.profile = {
                     adminRole  : false,
                     editorRole : false,
                     active     : 'Registered'
                  };
                  vm.profileStatus = {};
                  vm.profilePersistingInfo.newUser = true;
                  vm.profilePersistingInfo.passwordPersistingModeEnum = 'GenerateAutomatically';
                  init();
               }
            }

            function init () {
               swValidationService.setValidationMessagesEnabled(vm.form, true);
               vm.showPasswordDropdown = false;
               vm.showStatisticsDropDown = false;
               vm.emailNotValid = false;
               vm.hideResetPassword = vm.profilePersistingInfo.newUser;
               setIsDeactivated();
               setImgUploadState(vm.profile);
            }

            function setIsDeactivated() {
               vm.isDeactivated = vm.profile.active === 'Declined';
            }

            function activeSwitcher() {
               vm.isDeactivated = !vm.isDeactivated;
               vm.profile.active = vm.isDeactivated ? "Declined" : "Approved";
            }

            function passwordSwitcher () {
               vm.profilePersistingInfo.passwordPersistingModeEnum =
                     vm.profilePersistingInfo.passwordPersistingModeEnum === 'WithoutChanges' ? 'GenerateAutomatically' : 'WithoutChanges';
            }

            function adminRoleSwitcher () {
               vm.profile.adminRole = !vm.profile.adminRole;
            }

            function editorRoleSwitcher () {
               vm.profile.editorRole = !vm.profile.editorRole;
            }


            function showOldPassword () {
               return vm.profile && vm.profileStatus.hasPassword;
            }

            function isNewUser () {
               return  vm.profilePersistingInfo.newUser;
            }

            function save () {
               validCurrentPassword = true;
               if (vm.profilePersistingInfo.newPassword &&
                  ( vm.profilePersistingInfo.passwordConfirmation || ( vm.profile && !vm.profileStatus.hasPassword) )) {
                  vm.profilePersistingInfo.passwordPersistingModeEnum = 'SetNew';
               }
               vm.profilePersistingInfo.changeEmail = !vm.taskConfirmationHashCode;
               $timeout(function () {
                  if (vm.form.$valid) {
                     persistProfile().then(function (results) {
                        if (results[1] && results[1].data && results[1].data.status === 'TaskRegistered') {
                           vm.showConfirmationBlock = true;
                        }
                        else if (vm.taskConfirmationHashCode) {
                           swUserService.confirmAuthorizedTask(vm.taskConfirmationHashCode, true)
                              .then(function (result) {
                                 if (result.data.status === 'OK') {
                                    doAfterSaveActions();
                                 }
                                 else {
                                    vm.taskConfirmationHashCode = '';
                                 }
                              });
                        }
                        else if (results.emailAlredyIsUsed) {
                           validEmail = false;
                           swValidationService.setValidationMessagesEnabled(vm.form, true);
                        }
                        else if (results[0].status === 'ERROR' && results[0].text === 'Password confirmation failed.') {
                           validCurrentPassword = false;
                           swValidationService.setValidationMessagesEnabled(vm.form, true);
                        }
                        else {
                           doAfterSaveActions();
                        }
                     });
                  }
               });
            }

            function cancel () {
               vm.config.hideFn();
            }

            function back () {
               vm.profile.photo = oldPhoto;
               setImgUploadState(vm.profile);
               vm.isSelectImgView = false;
            }

            function doAfterSaveActions () {
               vm.config.hideFn();
            }

            function persistProfile () {
               if ( (!vm.showPasswordDropdown && vm.form.email.$valid) || (vm.showPasswordDropdown && vm.form.$valid) ) {
                  return swUserService.persistUserProfile(vm.profile, vm.profilePersistingInfo);
               }
               var defer = $q.defer();
               defer.reject();
               return defer.promise;
            }

            function validateName (name) {
               if (!name) {
                  name = '';
               }
               vm.isErrorMessage = true;
               return {
                  required: {
                     value: name
                  },
                  from: {
                     valid: /^[A-Za-z- ]{1,25}$/.test(name),
                     message: 'Profile.IncorrectFailure.text'
                  }
               };
            }

            var validEmail = true;

            function validateEmail (email) {
               vm.isErrorMessage = true;
               return {
                  required: {
                     value: email
                  },
                  mail: {
                     valid: /^[A-Za-z-\.0-9_-]{1,24}\@{1}[A-Za-z-\.0-9_-]{1,24}$/.test(email) && validEmail,
                     active: true
                  }
               };
            }

            var validCurrentPassword = true;

            function validateCurrentPassword () {
               return {
                  password: {
                     valid: vm.profilePersistingInfo.passwordConfirmation.length === 0 || (swUserService.validatePassword(vm.profilePersistingInfo.passwordConfirmation) && validCurrentPassword),
                     active: true
                  }
               };
            }

            function validateNewPassword () {
               if (vm.profilePersistingInfo.newPassword) {
                  return {
                     confirm: {
                        valid: swUserService.validatePassword(vm.profilePersistingInfo.newPassword),
                        active: vm.profilePersistingInfo.newPassword
                     }
                  };
               }
            }

            function validateConfirmationPassword () {
               if (vm.profilePersistingInfo.newPassword && vm.newPasswordConfirmation) {
                  return {
                     confirm: {
                        valid: vm.profilePersistingInfo.newPassword === vm.newPasswordConfirmation,
                        active: vm.profilePersistingInfo.newPassword
                     }
                  };
               }
            }

            function _updatePopupLayout() {
               $timeout(function () {
                  if (typeof vm.updatePopupLayout === 'function') {
                     vm.updatePopupLayout();
                  }
               });
            }

            function togglePasswordDropDown () {
               vm.showPasswordDropdown = !vm.showPasswordDropdown;
               _updatePopupLayout();
            }

            function toggleStatisticsDropDown() {
               vm.showStatisticsDropDown = !vm.showStatisticsDropDown;
               _updatePopupLayout();
            }

            function uploadUserPic (fileData) {
               vm.isLoading = true;

               fileType = /\w*\//.exec(fileData.type)[0].replace('/', '');
               if ( fileType !== 'image' ) {
                  vm.isLoading = false;
                  return;
               }
               vm.isImageUploaded = false;

               return swManageTestsService.uploadAttachment(fileData)
                  .then(function (response) {
                     vm.profile.photo = response.fileHash;
                     vm.isLoading = false;
                     blobDefault = fileData;
                     setImgUploadState({photo: fileData});
                  });
            }

            function setImgUploadState (_profile) {
               if ( !_profile || _profile.photo && !_.trim(_profile.photo).length ) {
                  vm.isImageUploaded = false;
                  vm.isImageEmpty    = true;
                  return;
               }

               vm.imgPreviewSrc = typeof _profile.photo === 'object' ? $window.URL.createObjectURL(_profile.photo) : getImgSrc(_profile.photo);
               vm.cropped.startImg = vm.imgPreviewSrc;
               vm.isImageUploaded = true;
               vm.isImageEmpty    = false;
            }

            function setSelectImgView (_data) {
               uploadUserPic(_data)
                  .then(function () {
                     vm.isSelectImgView = true;
                  });
            }

            function useSelection () {
               setImgPreview(vm.cropped.resultImg);
               uploadUserPic(vm.profilePersistingInfo.photo)
                  .then(function () {
                     $timeout(function () {
                        vm.isSelectImgView = false;
                     });
                  });
            }

            function getImgSrc (_photo) {
               if ( _photo ) {
                  return swManageTestsService.getTestFileSource(_photo);
               }
               return '#';
            }

            function setImgPreview (_dataUri) {
               vm.profilePersistingInfo.photo = getBlobFromBase64(_dataUri);
               vm.imgPreviewSrc = _dataUri;
            }

            function getBlobFromBase64 (dataURI) {
               if (!dataURI) {
                  return;
               }
               //jshint ignore: start
               var byteString = atob(dataURI.split(',')[1]);
               var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
               var ab = new ArrayBuffer(byteString.length);
               var ia = new Uint8Array(ab);
               for (var i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
               }
               var blob = new Blob([ab], {type: mimeString});
               var file = new File([blob], 'modified_' + blobDefault.name, {type:blob.type});
               return file;
               //jshint ignore: end
            }
         }]
   });
});
