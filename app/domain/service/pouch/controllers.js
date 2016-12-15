define([
   './controller/UserPublication',
   './controller/Publications',
   './controller/UserStudy',
   './controller/Settings',
   './controller/Materials',
   './controller/StudyFlashcards',
   './controller/StudyCourses',
   './controller/StudyClass',
   './controller/Notification',
   './controller/PersonalMessage',
   './controller/Users',
   './controller/Reports',
   './controller/Vocabulary',
   './controller/ManageTests',
   './controller/Discussion'
], function (/* ...arguments */) {
   "use strict";
   var controllers = [
      './controller/UserPublication',
      './controller/Publications',
      './controller/UserStudy',
      './controller/Settings',
      './controller/Materials',
      './controller/StudyFlashcards',
      './controller/StudyCourses',
      './controller/StudyClass',
      './controller/Notification',
      './controller/PersonalMessage',
      './controller/Users',
      './controller/Reports',
      './controller/Vocabulary',
      './controller/ManageTests',
      './controller/Discussion'
   ];
   var args = Array.prototype.slice.call(arguments);
   var result = {};

   for (var i = args.length - 1; i >= 0; i--) {
      result[controllers[i].toLowerCase()] = args[i];
   }
   return result;
});
