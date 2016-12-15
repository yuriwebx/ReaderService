define([

   'swComponentFactory',
   'module',
   'text!./ResetPassword.html',
   'less!./ResetPassword'

   ], function(

   swComponentFactory,
   module,
   template

   ){

   'use strict';

   swComponentFactory.create({
      module : module,
      template: template,
      submachine: true,
      isolatedScope: {
         config: '='
      },
      controller: ['$scope', 'swUserService', 'swLoginService', 'swValidationService', 'swI18nService',
          function($scope,   swUserService, swLoginService, swValidationService, swI18nService)
      {
         var serverValidateEmail = true;

         $scope.swInit = function()
         {
            $scope.resetPasswordInfo = {email: '', confirm: true};
            if ($scope.config.taskConfirmationHashCode)
            {
               $scope.taskConfirmationHashCode = $scope.config.taskConfirmationHashCode;
               $scope.config.taskConfirmationHashCode = '';
               $scope.showResetPasswordBlock = true;
            }
            else
            {
               $scope.showRegistrationBlock = true;
            }
         };
         
         $scope.registerTask = function()
         {
           serverValidateEmail = true;
            swValidationService.setValidationMessagesEnabled($scope.form, true);
            if ($scope.form.email.$valid)
            {
               //debugger;//service client - tested
               swUserService.registerEmailAuthorizedTask($scope.resetPasswordInfo.email, 'ResetPassword').then(function(result) {
                  if (result.data.status === 'OK')
                  {
                     $scope.resetPasswordInfo.taskHashCode = result.data.data.taskHashCode;
                     $scope.showRegistrationBlock = false;
                     $scope.showConfirmationBlock = true;
                  }
                  else{
                     serverValidateEmail = false;
                     $scope.errorMessageEmail = swI18nService.getResource('ValidationError.resetPasswordServerCheck.label');
                     swValidationService.setValidationMessagesEnabled($scope.form, true);
                  }
               });
            }
            else{
               $scope.errorMessageEmail = swI18nService.getResource('ValidationError.resetPasswordClientCheck.label');
            }
         };

         $scope.confirmTask = function()
         {
            //debugger;//service client - tested
            swUserService.confirmAuthorizedTask($scope.resetPasswordInfo.taskConfirmationHashCode, $scope.resetPasswordInfo.confirm).then(function(result) {
               if (result.data.status === 'OK')
               {
                  $scope.showConfirmationBlock = false;
                  $scope.showResetPasswordBlock = true;
               }
            });
         };

         $scope.reset = function()
         {
            swValidationService.setValidationMessagesEnabled($scope.form, true);
            if ($scope.form.confirmPassword.$valid && $scope.form.password.$valid)
            {
               //debugger;//service client - tested
               swUserService.resetPassword($scope.resetPasswordInfo.password, $scope.resetPasswordInfo.taskConfirmationHashCode || $scope.taskConfirmationHashCode).then(function(result) {
                  if (result.data.status === 'OK')
                  {
                     swLoginService.performLogin({taskConfirmationHashCode: $scope.resetPasswordInfo.taskConfirmationHashCode || $scope.taskConfirmationHashCode}, 'hashcode').then(
                        function(loginResult){
                           if (loginResult && loginResult.status === 'loggedIn')
                           {
                              $scope.swSubmachine.end('completed');
                           }
                        });
                  }
               });
            }
         };
         
         $scope.validatePasswordConfirmation = function()
         {
            return {
               confirm: {
                  valid: $scope.resetPasswordInfo && $scope.resetPasswordInfo.password === $scope.confirmPassword,
                  active: !!$scope.resetPasswordInfo
               },
               required: {
                  value: $scope.resetPasswordInfo && $scope.confirmPassword,
                  message: 'Please, confirm your new password',
                  active: true
               }
            };
         };
         $scope.validatePassword = function()
         {
            return {
               password: {
                  valid: $scope.resetPasswordInfo.password && swUserService.validatePassword($scope.resetPasswordInfo.password),
                  active: !!$scope.resetPasswordInfo
               },
               required: {
                  value: $scope.resetPasswordInfo && $scope.resetPasswordInfo.password,
                  message: 'Please, enter new password',
                  active: true
               }
            };
         };

         $scope.validateEmail = function(mail)
         {
            return {
               required : {
                  value: mail
               },
               email: {
                  valid: /^[A-Za-z-\.0-9_-]{1,24}\@{1}[A-Za-z-\.0-9_-]{1,24}$/.test(mail) && serverValidateEmail,
                  active: true
               }
            };
         };
   }]});

});
