define([

   'swComponentFactory',
   'module',
   'underscore',
   'text!./RegisterUserProfile.html',
   'less!./RegisterUserProfile'

], function (swComponentFactory, module, _, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope: {
         config: '=',
         registerApi: '='
      },
      controller: [
         '$scope',
         'swUserService',
         'swValidationService',
         'swActivityMonitorService',
         '$window',
         function (
            $scope,
            swUserService,
            swValidationService,
            swActivityMonitorService,
            $window) {
            var vm = $scope;
            var confirmIsPressed;
            var isValidEmail = true;
            var isValidConfirmTask = true;

            vm.registrationProfileInfo = {
               lastName  : '',
               firstName : '',
               email     : '',
               password  : '',
               confirm   : true
            };
            vm.confirmPassword = '';
            vm.steps = {
               registration : false,
               confirmation : false,
               treatment    : false
            };

            vm.swInit                       = _init;
            vm.swDestroy                    = _destroy;
            vm.registerProfile              = registerProfile;
            vm.confirmTask                  = confirmTask;
            vm.sendConfirmationCode         = sendConfirmationCode;
            vm.validatePasswordConfirmation = validatePasswordConfirmation;
            vm.validatePassword             = validatePassword;
            vm.validateName                 = validateName;
            vm.validateEmail                = validateEmail;
            vm.validateConfirmTask          = validateConfirmTask;

            function _init () {
               if ( vm.registerApi.pendingLogIn ) {
                  vm.registerApi.pendingLogIn = false;
                  setActiveStep('treatment');
                  swActivityMonitorService.addActivityMonitorListener(onUserActiveStatusChanged);
               }
               else if ( vm.config.taskConfirmationHashCode ) {
                  vm.config.taskConfirmationHashCode = '';
                  setActiveStep('treatment');
               }
               else {
                  setActiveStep('registration');
               }
            }

            function _destroy () {
               swActivityMonitorService.removeActivityMonitorListener(onUserActiveStatusChanged);
            }

            function onUserActiveStatusChanged (_data) {
               if ( _data && _data.user.active === 'Approved' ) {
                  $window.location.reload();
               }
            }

            function isValidProfile () {
               return vm.form.firstName.$valid && vm.form.lastName.$valid &&
                      vm.form.confirmPassword.$valid && vm.form.password.$valid && vm.form.mail.$valid;
            }

            function registerProfile () {
               confirmIsPressed = true;
               isValidEmail = true;
               swValidationService.setValidationMessagesEnabled(vm.form, true);
               if ( isValidProfile() ) {
                  swUserService.registerUserProfile(vm.registrationProfileInfo)
                     .then(function (result) {
                        if ( result.data.status === 'OK' ) {
                           confirmIsPressed = false;
                           vm.registrationProfileInfo.taskHashCode = result.data.data.taskHashCode;
                           setActiveStep('confirmation');
                        }
                        else {
                           isValidEmail = false;
                        }
                     });
               }
            }

            function confirmTask () {
               confirmIsPressed = true;
               swValidationService.setValidationMessagesEnabled(vm.form, true);
               isValidConfirmTask = true;
               swUserService.confirmAuthorizedTask(vm.registrationProfileInfo.taskConfirmationHashCode, vm.registrationProfileInfo.confirm)
                  .then(function (result) {
                     confirmIsPressed = false;
                     if ( result.data.status === 'OK' ) {
                        setActiveStep('treatment');
                     }
                     else {
                        isValidConfirmTask = false;
                     }
                  });
            }

//            function performLogin (loginInfo, authType) {
//               swLoginService.performLogin(loginInfo, authType).then(
//                  function (loginResult) {
//                     if ( loginResult && loginResult.status === 'loggedIn' ) {
//                        vm.swSubmachine.end('completed');
//                     }
//                  });
//            }

            function sendConfirmationCode () {
               confirmIsPressed = true;
               swUserService.confirmRegistration(vm.confirmationInfo)
                  .then(function () {
                     confirmIsPressed = false;
                     vm.swSubmachine.end('completed');
                  }
               );
            }

            function validatePasswordConfirmation () {
               return {
                  required: {
                     value: vm.confirmPassword
                  },
                  confirm: {
                     valid: vm.registrationProfileInfo.password === vm.confirmPassword,
                     active: true
                  }
               };
            }

            function validatePassword () {
               return {
                  required: {
                     value: vm.registrationProfileInfo.password
                  },
                  password: {
                     valid: swUserService.validatePassword(vm.registrationProfileInfo.password),
                     active: true
                  }
               };
            }

            function validateName (name) {
               return {
                  required: {
                     value: name
                  },
                  name: {
                     valid: /^[A-Za-z- ]{1,25}$/.test(name),
                     active: true
                  }
               };
            }

            function validateEmail (email) {
               return {
                  required: {
                     value: email
                  },
                  mail: {
                     valid: /^[A-Za-z-\.0-9_-]{1,24}\@{1}[A-Za-z-\.0-9_-]{1,24}$/i.test(email) && isValidEmail,
                     active: true
                  }
               };
            }

            function validateConfirmTask () {
               return {
                  required: {
                     value: 'empty'
                  },
                  confirmTask: {
                     valid: isValidConfirmTask,
                     active: true
                  }
               };
            }

            function setActiveStep (_stepName) {
               _.each(_.keys(vm.steps), function (_s) {
                  vm.steps[_s] = (_s === _stepName);
               });
            }
         }]
   });
});
