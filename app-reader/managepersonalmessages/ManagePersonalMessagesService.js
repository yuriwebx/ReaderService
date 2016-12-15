define([
   'module',
   'underscore',
   'swServiceFactory',
   'text!./managemessage/ManageMessage-header.html',
   'text!./managemessage/ManageMessage-footer.html'
], function (module, _, swServiceFactory, headerTemplate, footerTemplate) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swPersonalMessageService',
         'swUserService',
         'swStudyClassService',
         '$rootScope',
         function (swPopupService, swPersonalMessageService, swUserService, swStudyClassService, $rootScope) {
            
            this.sendMessage = function(recipients, classId) {
               manageMessage(recipients, null, classId);
            };

            this.viewMessage = function(message) {
               manageMessage(null, message, null);
            };
            
            function manageMessage(recipients, message, classId) {
               var $scope = $rootScope.$new();
               var popupConfig;
               var popup;

               $scope.config = {
                  hideFn: function(){
                     if(popup){popup.hide();}
                  },
                  recipients: _.map(recipients, formatRecipient),
                  message: message,
                  classId: classId
               };

               if (!popup || popup.isHidden()) {
                  popupConfig = {
                     scope: $scope,
                     layout: {},
                     modal: false,
                     header: headerTemplate,
                     content: '<sw-manage-message config="config"></sw-manage-message>',
                     footer: footerTemplate,
                     backdropVisible: true,
                     customClass: 'studentMessage'
                  };
                  
                  if($scope.config.classId) {
                     searchStudents($scope.config.classId, _.pluck(recipients, 'userId'))
                     .then(function(possibleRecipients){
                        possibleRecipients = _.map(possibleRecipients, addPhotoLink);
                        $scope.config.possibleRecipients = possibleRecipients;
                        popup = swPopupService.show(popupConfig);
                     });
                  }
                  else {
                     $scope.config.possibleRecipients = [];
                     popup = swPopupService.show(popupConfig);
                  }
               }
            }

            function addPhotoLink(possibleRecipient) {
               if (possibleRecipient.photo && possibleRecipient.photo.fileHash) {
                  possibleRecipient.isPhoto = true;
                  possibleRecipient.photoLink = swUserService.getUserPhoto(possibleRecipient.photo.fileHash);
               }
               return possibleRecipient;
            }

            function formatRecipient(recipient) {
               return _.defaults(recipient, {
                  id: _.uniqueId('select_'),
                  text: recipient.firstName + ' ' + recipient.lastName,
                  checked : false
               });
            }

            function searchStudents(classId, recipients) {
               return swStudyClassService.searchClassStudents(classId, '')
               .then(function(response){
                  var possibleRecipients = _.filter(response.data, function (student) {
                     return student.studyClassType !== 'Teacher';
                  });
                  possibleRecipients = _.map(possibleRecipients, function(recipient){
                     var formatedRecipient = formatRecipient(recipient);
                     if(recipients.indexOf(recipient.userId) !== -1){
                        formatedRecipient.checked = true;
                     }
                     return formatedRecipient;
                  });

                  return possibleRecipients;
               });
            }
            
            this.markMessageAsRead = function(message) {
               return swPersonalMessageService.updatePersonalMessageState(swUserService.getUserId(), [message._id], true);
            };

            this.markMessageAsUnread = function(message) {
               return swPersonalMessageService.updatePersonalMessageState(swUserService.getUserId(), [message._id], false);
            };
         }]
   });
});