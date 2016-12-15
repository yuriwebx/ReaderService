define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swRestService',
         function (swRestService) {
            var userCategories = [
               {
                  type  : 'Active Users',
                  title : 'Active Users'
               },
               {
                  type  : 'Administrators',
                  title : 'Admins'
               },
               {
                  type  : 'Editors',
                  title : 'Editors'
               },
               {
                  type  : 'Inactive Users',
                  title : 'Inactive Users'
               },
               {
                  type  : 'Registered',
                  title : 'Requests'
               }
            ];

            this.getUserCategories = getUserCategories;
            this.deleteUser        = deleteUser;
            this.searchUsers       = searchUsers;
            this.confirmUserAccess = confirmUserAccess;

            function getUserCategories () {
               return userCategories;
            }

            function deleteUser (userId) {
               return swRestService.restSwHttpRequest('delete', 'Users', {userId: userId});
            }

            function confirmUserAccess (userId, confirm) {
               return swRestService.restSwHttpRequest('post', 'Users', 'confirmaccess', {
                  userId  : userId,
                  confirm : confirm
               });
            }

            function searchUsers (category, filter, itemsCount) {
               return swRestService.restSwHttpRequest('get', 'Users', 'search', {
                  category   : category,
                  filter     : filter,
                  itemsCount : itemsCount
               })
               .then(function (result) {
                  var total = 0;
                  if ( result.data.totalResults > 0 ) {
                     total = result.data.totalResults;
                     result = result.data.result;
                  }
                  else {
                     result = [];
                  }
                  return {
                     result : result,
                     total  : total
                  };
               }, function (reason) {
                  if ( reason.status !== 0 ) {
                     return reason;
                  }
               });
            }
         }
      ]
   });
});