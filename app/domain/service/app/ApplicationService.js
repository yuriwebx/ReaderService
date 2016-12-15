define(['module', 'swServiceFactory', 'swAppUrl'], function(module, swServiceFactory, swAppUrl) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : ['$q', 'swUserService', 'swLoginService', function($q, swUserService, swLoginService) {
         var taskTypesToGo = ['ResetPassword', 'RegisterUserProfile'];
         this.userSession = undefined;
         
         this.confirmAuthorizedTask = function()
         {
            var defer = $q.defer();
            if (swAppUrl.confirmationInfo) {
               //debugger;//service client - tested
               var  confirm = swAppUrl.confirmationInfo.confirm === 'true'; 
               swUserService.confirmAuthorizedTask(swAppUrl.confirmationInfo.taskConfirmationHashCode, confirm).then(
                  function (result) {
                     if ( result.data.status === 'OK' && result.data.data.status === 'Approved' ) {
                        var taskConfirmationHashCode = swAppUrl.confirmationInfo.taskConfirmationHashCode;
                        if (taskTypesToGo.lastIndexOf(result.data.data.taskType) > -1) {
                           defer.resolve({'useCaseToGo': result.data.data.taskType, 'taskConfirmationHashCode': taskConfirmationHashCode});
                        }
                        else {
                           swLoginService.performLogin({taskConfirmationHashCode: taskConfirmationHashCode}, 'hashcode').then(
                              function () {
                                 swAppUrl.confirmationInfo = undefined;
                                 defer.reject();
                              });
                        }
                     }
                     else {
                        swAppUrl.confirmationInfo = undefined;
                        defer.reject();
                     }
                  });
            }
            else
            {
               defer.reject();
            }
            return defer.promise;
         };
      }]
   });
});