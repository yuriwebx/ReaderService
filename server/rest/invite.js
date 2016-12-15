/*jslint node: true */
(function() {
   'use strict';
   var _ = require('underscore');
   var q = require('q');

   var mail = require('../mail/sendPasswordMailController.js');
   var manageUsers = require('./manageUsers.js');

   var config = require(__dirname + '/../utils/configReader.js');

   function getUserProfiles(ids) {
      var promises = _.map(ids, function(id) {
         return manageUsers.getUser(id);
      });
      return promises;
   }

   function getTemplateName(inviteContext) {
      var templateName = 'sendInvitedToClass';
      if(inviteContext.classType === 'Independent Study') {
         templateName = 'sendInvitedToIndependentStudy';
      }
      else if (inviteContext.classType === 'Moderated' &&
         inviteContext.studentConfirmationStatus === "Accepted" &&
         inviteContext.teacherConfirmationStatus === "Requested") {
         templateName = 'sendSubscribeToClass';
      }
      else if(inviteContext.classType) {
         templateName = 'sendInvitedToClass';
      }
      else if(inviteContext.status){
         templateName = 'sendInviteToEditStudyGuide';
      }
      else if (inviteContext.type === 'inviteTeacherToClass') {
         templateName = 'sendInviteTeacherToClass';
      }
      return templateName;
   }

   function getSubjectOfInvite(inviteContext) {
      var emailTitle = 'invitedToClass';
      if(inviteContext.classType === 'Independent Study') {
         emailTitle = 'studentIsApproved';
      }
      else if (inviteContext.studentConfirmationStatus === "Accepted" &&
         inviteContext.teacherConfirmationStatus === "Requested") {
         emailTitle = 'subscribeToClass';
      }
      else if (inviteContext.classType !== 'Institutional' &&
         inviteContext.studentConfirmationStatus === "Accepted" &&
         inviteContext.teacherConfirmationStatus === "Accepted") {
         emailTitle = 'studentIsApproved';
      }
      else if(inviteContext.classType){
         emailTitle = 'invitedToClass';
      }
      else if (inviteContext.type === 'inviteTeacherToClass') {
         emailTitle = 'inviteTeacherToClassTitle';
      }
      else if(inviteContext.status){
         emailTitle = 'editorsInvitation';
      }
      return emailTitle;
   }

   function getCurrentURL(inviteContext){
      var inviteAppUrl = config.buildURL;
      if ( inviteContext.classId ) {
         inviteAppUrl =  inviteAppUrl + 'managestudyclass/classId/' + inviteContext.classId;
      }
      else if ( inviteContext.studyGuideId ) {
         inviteAppUrl = inviteAppUrl.indexOf('index.html#') === -1 ?
                    inviteAppUrl.replace('reader/#/', 'editor/#/') :
                    inviteAppUrl.replace('/reader/index.html#/', '/editor/index.html#/');
         inviteAppUrl = inviteAppUrl + 'reader/_id/' + inviteContext.studyGuideId;
      }
      return inviteAppUrl;
   }

   function sendEmailInvite(recipientIds, inviteContext, emailInfoParams, lang, senderProfile) {
      var recipientProfilePromises = getUserProfiles(recipientIds);
      return q.all(recipientProfilePromises)
         .then(function(recipientProfiles) {
            var sendEmailPromises = _.map(recipientProfiles, function(recipientProfile) {
               var templateName = getTemplateName(inviteContext);
               var subjectKey = getSubjectOfInvite(inviteContext);
               emailInfoParams.link = getCurrentURL(inviteContext);
               var options = _.extend(recipientProfile, emailInfoParams);
               return mail.sendInvite(senderProfile, recipientProfile, templateName, subjectKey, options, lang);
            });
            return q.all(sendEmailPromises);
         })
         .then(function(response) {
            return response;
         })
         .catch(function(err) {
            return err;
         });
   }

   module.exports = {
      sendEmailInvite : sendEmailInvite,
      getCurrentURL   : getCurrentURL
   };
})();