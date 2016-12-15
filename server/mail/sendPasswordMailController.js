/*jshint node: true*/
'use strict';

var errorMessegas = {
   sendEmail : 'Sendmail error: %s.'
};
var util = require('util');

var handlebars = require('handlebars');
var _ = require('underscore');
var fs = require('fs');

var q = require('q');
var config = require(__dirname + '/../utils/configReader.js');
var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

//NodeMailer
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transporter = nodemailer.createTransport(smtpTransport(config.smtpConfig));

var utils = require('../utils/utils.js');

function getLocalizations(lang) {
   var path = __dirname + '/../../config/language.srv.' + lang + '.json',
      prefix = 'mail.',
      local = {},
      predicate = function (key) {
         return key.indexOf(prefix) === 0;
      };

   if (fs.existsSync(path)) {
      var data = JSON.parse(fs.readFileSync(path));
      _.each(data, function (val, key) {
         if (predicate(key)) {
            local[key.substr(prefix.length)] = val;
         }
      });
   }
   else {
      logger.error('did not find file:', path);
   }
   return local;
}


function getTemplate(language, templateFileName) {
   var local = getLocalizations(language);
   var path = __dirname + '/templates/' + local[templateFileName];
   var source;
   if (fs.existsSync(path) && local.hasOwnProperty(templateFileName)) {
      source = fs.readFileSync(path);
   }
   else {
      logger.error('did not find file:', path);
   }
   return source;
}

function redirectIrlsEmail(emailToUser) {
   var match = emailToUser.match(/^([^@]+)@irls$/);
   if (match) {
      emailToUser = config.redirectIrlsEmailPattern.replace('[mail]', match[1]);
   }
   else if (emailToUser.indexOf('@irls') !== -1) {
      logger.error('did not found mail:', emailToUser);
   }
   return emailToUser;
}

function sendMail(emailSys) {
   var defer = q.defer();
   var mailTemplate = {
      from : emailSys.senderName + " <" + emailSys.senderEmail + ">",
      to : redirectIrlsEmail(emailSys.recipientEmail),
      subject : emailSys.subject,
      html : emailSys.body
   };

   transporter.sendMail(mailTemplate, function (error, info) {
      var message = '';
      if (error) {
         message = util.format(errorMessegas.sendEmail, error);
         defer.reject(utils.addSeverityResponse(message, config.businessFunctionStatus.error));
      }
      else {
         logger.log('Message sent: ' + info.response);
         defer.resolve({
            status : config.businessFunctionStatus.ok
         });
      }
   });
   return defer.promise;
}

function createEmail(recipientProfile, subject, bodyParams, language, templateName, senderProfile) {
   if (!senderProfile) {
      senderProfile = getBrandSenderProfile(language);
   }
   var source = getTemplate(language, templateName);
   var template = handlebars.compile(source.toString());
   var body = _.extend(bodyParams, {
      brandName : config.brandName,
      brandFullName : config.brandFullName
   });
   var emailSys = {
      senderEmail : senderProfile.email,
      senderName : senderProfile.firstName + ' ' + senderProfile.lastName,
      recipientEmail : recipientProfile.email,
      recipientName : recipientProfile.firstName + ' ' + recipientProfile.lastName,
      subject : subject,
      body : template(body)
   };
   template();
   return emailSys;
}

function getBrandSenderProfile(language) {
   var local = getLocalizations(language);
   return {
      firstName : config.brandName,
      lastName : local.administration,
      email : config.brandNoReplyMailAddress
   };
}

function createSubject(subjectKey, language, suffix) {
   var local = getLocalizations(language);
   var subject = suffix ? local[subjectKey] + ' ' + suffix : local[subjectKey];
   return subject;
}

function addConfirmationObj(recipientProfile, host, task) {
   return _.extend(recipientProfile, {
      сonfirmationCode : task.taskConfirmationHashCode,
      link : host + "taskConfirmationHashCode=" + task.taskConfirmationHashCode + '&confirm=' + true,
      declinedLink : host + "taskConfirmationHashCode=" + task.taskConfirmationHashCode + '&confirm=' + false
   });
}

function sendConfirmEmail(recipientProfile, templateName, subjectKey, host, task, language) {
   var subject = createSubject(subjectKey, language, config.brandName);
   var bodyParams = addConfirmationObj(recipientProfile, host, task);
   var emailSys = createEmail(recipientProfile, subject, bodyParams, language, templateName);
   return sendMail(emailSys);
}

function createVocabularyTemplate(logVocabulary) {
   var logVocabularyHtml = '';
   logVocabularyHtml += '<br>';
   logVocabularyHtml += '<div>';
   for (var i = 0; i < logVocabulary.length; i++) {
      logVocabularyHtml += '<p>Group interval lower bound ' + logVocabulary[i].interval.lowerBound + ' upper bound ' + logVocabulary[i].interval.upperBound + '</p>';
      logVocabularyHtml += '<p>Questions: ' + logVocabulary[i].questions + '</p>';
      logVocabularyHtml += '<p>Answers:</p>';
      for (var j = 0; j < logVocabulary[i].answers.length; j++) {
         logVocabularyHtml += '<p>' + (j + 1) + '.' + logVocabulary[i].answers[j].text + '</p>';
      }
      logVocabularyHtml += '<p>Correct answers: ' + logVocabulary[i].correctAnswer + '</p>';
      logVocabularyHtml += '<p>Chosen answer: ' + logVocabulary[i].currentAnswer + '</p>';
      logVocabularyHtml += '<br>';
   }
   logVocabularyHtml += '</div><br><br><p>Please, do not reply on this letter.</p>';
   return logVocabularyHtml;
}

module.exports = {
   sendPassword : function (recipientProfile, password, newUser, language, options) {
      var templateName = 'sendPasswordTemplate';
      var subject = createSubject('getstarted', language);
      var _opts = options || {};
      var bodyParams = _.extend(recipientProfile, {
         newUser  : newUser,
         password : password,
         link     : _opts.link
      });
      var emailSys = createEmail(recipientProfile, subject, bodyParams, language, templateName);
      return sendMail(emailSys);
   },
   RegisterUserProfile : function (recipientProfile, host, task, language) {
      return sendConfirmEmail(recipientProfile, 'sendConfirmationCode', 'getstarted', host, task, language);
   },
   ResetPassword : function (recipientProfile, host, task, language) {
      return sendConfirmEmail(recipientProfile, 'sendNewPassword', 'resetPassword', host, task, language);
   },
   ConfirmNewEmail : function (recipientProfile, host, task, language) {
      recipientProfile.email = task.email;
      return sendConfirmEmail(recipientProfile, 'sendConfirmNewEmail', 'newEmail', host, task, language);
   },
   ConfirmNewEmailAndPassword : function (recipientProfile, host, task, language) {
      return sendConfirmEmail(recipientProfile, 'sendConfirmNewEmail', 'newEmail', host, task, language);
   },
   sendInvite : function (senderProfile, recipientProfile, templateName, subjectKey, bodyParams, language) {
      var subject = createSubject(subjectKey, language, bodyParams.emailTitleSuffix);
      var emailSys = createEmail(recipientProfile, subject, bodyParams, language, templateName, senderProfile);
      return sendMail(emailSys);
   },
   sendResultsVocabulary : function (profile, logVocabulary, language) {
      var logVocabularyHtml = createVocabularyTemplate(logVocabulary);
      var templateName = 'sendResultsVocabulary';
      var subject = createSubject('sendResults', language);
      var bodyParams = profile;
      var emailSys = createEmail(profile, subject, bodyParams, language, templateName);
      emailSys.body += logVocabularyHtml;
      return sendMail(emailSys);
   },
   sendAdminAcceptance: function (recipientProfile, senderProfile, language, options) {
      var subject    = createSubject('adminAcceptance', language, config.brandName);
      var opts       = options || {};
      var bodyParams = {
         recipientName : recipientProfile.firstName + ' ' + recipientProfile.lastName,
         senderName    : senderProfile.firstName + ' ' + senderProfile.lastName,
         link          : opts.link
      };
      var emailSys = createEmail(recipientProfile, subject, bodyParams, language, 'sendAdminAcceptanceEn', senderProfile);
      return sendMail(emailSys);
   },
   sendAdminDecline: function (recipientProfile, senderProfile, language) {
      var subject    = createSubject('adminDecline', language, config.brandName);
      var bodyParams = {
         recipientName : recipientProfile.firstName + ' ' + recipientProfile.lastName,
         senderName    : senderProfile.firstName + ' ' + senderProfile.lastName
      };
      var emailSys = createEmail(recipientProfile, subject, bodyParams, language, 'sendAdminDeclineEn', senderProfile);
      return sendMail(emailSys);
   },
   sendNewUserRequest: function (recipientProfile, senderProfile, language, options) {
      var subject = createSubject('newUserRequest', language, config.brandName);
      var bodyParams = {
         senderName : senderProfile.firstName + ' ' + senderProfile.lastName,
         email      : senderProfile.email,
         link       : options.link
      };
      var emailSys = createEmail(recipientProfile, subject, bodyParams, language, 'sendNewUserRequestEn');
      return sendMail(emailSys);
   }
};