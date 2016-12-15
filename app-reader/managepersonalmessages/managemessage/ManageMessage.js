define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./ManageMessage.html',
   'less!./ManageMessage.less'
], function(module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         config: '='
      },
      controller: [
         '$scope',
         'swPersonalMessageService',
         'swUserService',
         function($scope,
                  swPersonalMessageService,
                  swUserService) {
            var vm = $scope;

            var currentState = '';

            vm.swInit = swInit;
            vm.config.sendFn = send;
            vm.config.isNotEmptyMessage = isNotEmptyMessage;
            vm.isNotEmptyMessage = isNotEmptyMessage;
            vm.config.isCurrentState = isCurrentState;
            vm.config.changeCurrentState = changeCurrentState;
            vm.studentFilter = studentFilter;
            vm.selectPossibleRecipients = selectPossibleRecipients;
            vm.selectAll = selectAll;

            vm.config.popupStates = {
               createMessage: 'createMessage',
               viewMessage: 'viewMessage',
               selectRecipients: 'selectRecipients'
            };
            currentState = vm.config.popupStates.createMessage;

            vm.messageObj = {
               text : '',
               subject: ''
            };
            vm.possibleRecipients = vm.config.possibleRecipients || [];
            vm.studentFilterObj = {
               text: ''
            };
            vm.isSelectAll = false;

            vm.resipientsObj = {
               recipients : vm.config.recipients || []
            };

            vm.select2Options = {
               multiple: true,
               data: vm.possibleRecipients,
               formatNoMatches : function (){
                  return  'not found students';
               }
            };

            function swInit() {
               
               if (vm.config.recipients && vm.config.recipients.length !== 0) {
                  vm.resipientsObj.recipients = vm.config.recipients;
               }
               else if (!_.isEmpty(vm.config.message)) {
                  currentState = vm.config.popupStates.viewMessage;
                  vm.config.message.registeredAt = new Date(vm.config.message.registeredAt || Date.now()).toLocaleDateString();

                  swUserService.getUserProfileState(vm.config.message.fromUserId).then(function(profileInfo) {
                     vm.fromUserProfile = profileInfo.userProfileInfo;
                  });

                  swUserService.getUserProfileState(vm.config.message.toUserId).then(function(profileInfo) {
                     vm.toUserProfile = profileInfo.userProfileInfo;
                  });

               }
            }
            
            function selectAll(){
               vm.isSelectAll = !vm.isSelectAll;
               var possibleRecipientsAfterfilter = _.filter(vm.possibleRecipients, studentFilter);
               vm.possibleRecipients = _.map(vm.possibleRecipients, function(recipient) {
                  if(possibleRecipientsAfterfilter.indexOf(recipient) !== -1){
                     recipient.checked = vm.isSelectAll;
                  }
                  return recipient;
               });
               vm.resipientsObj.recipients = _.filter(vm.possibleRecipients, function(recipient){
                  return recipient.checked;
               });
            }

            function selectPossibleRecipients(possibleRecipient) {
               possibleRecipient.checked = !possibleRecipient.checked;
               if(possibleRecipient.checked) {
                  vm.resipientsObj.recipients.push(possibleRecipient);
               }
               else {
                  var resIndex = vm.resipientsObj.recipients.indexOf(possibleRecipient);
                  vm.resipientsObj.recipients.splice(resIndex, 1);
               }
            }

            function studentFilter(item){
               return item.firstName.toLowerCase().indexOf(vm.studentFilterObj.text) !== -1 ||
                      item.lastName.toLowerCase().indexOf(vm.studentFilterObj.text) !== -1;
            }

            function updatePossibleRecipient() {
               if(currentState !== vm.config.popupStates.selectRecipients){
                  return;
               }
               var recipientIds = _.pluck(vm.resipientsObj.recipients, 'userId');
               vm.possibleRecipients = _.map(vm.possibleRecipients, function(recipient) {
                  recipient.checked = recipientIds.indexOf(recipient.userId) !== -1;
                  return recipient;
               });
            }

            function isCurrentState() {
               updatePossibleRecipient();
               var args = Array.prototype.slice.call(arguments); 
               return args.indexOf(currentState) !== -1;
            }

            function changeCurrentState(state) {
               currentState = state;
            }
            
            function send() {
               var recipientIds = _.map(vm.resipientsObj.recipients, function(s) {
                  return s.userId;
               });
               swPersonalMessageService.persistPersonalMessage(swUserService.getUserId(), recipientIds, vm.messageObj.text, vm.messageObj.subject).then(function() {
                  vm.config.hideFn();
               });
            }

            function isNotEmptyMessage() {
               return vm.messageObj.text.length === 0 || vm.messageObj.subject.length === 0 ||
                      (vm.resipientsObj.recipients && vm.resipientsObj.recipients.length === 0);
            }
         }
      ]
   });
});