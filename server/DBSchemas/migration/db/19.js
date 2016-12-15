(function () {
   'use strict';

   var translate={
      "applicationsessions":{
            newName:"ApplicationSession"
      },
      "book":{
         newName:"Book"
      },
      "collection":{
         newName:"Collection"
      },
      "dictionary":{
         newName:"Dictionary"
      },
      "DictionaryTerm":{
         newName:"DictionaryTermStudy"
      },
      "emailtask":{
         newName:"EmailAuthorizedTask"
      },
      "essayTask":{
         newName:"EssayTask"
      },
      "materials":{
         newName:"Material"
      },
      "personal messages":{
         newName:"PersonalMessage"
      },
      "sessions":{
         newName:"Session"
      },
      "setting":{
         newName:"Setting"
      },
      "study course":{
         newName:"StudyCourse"
      },
      "study guide":{
         newName:"StudyGuide"
      },
      "studyclass":{
         newName:"StudyClass",
         joinEndDate: "joinEndDate",
         expectedDailyWork: "expectedDailyWork"
      },
      "studycourseItem":{
         newName:"StudyCourseItem"
      },
      "supplemental":{
         newName:"Supplemental"
      },
      "testQuestion":{
         newName:"FlashcardStudy"
      },
      "testquestions":{
         newName:"TestQuestion"
      },
      "tests":{
         newName:"Test",
         testName:"name",
         testDescription:"description"
      },
      "user":{
         newName:"UserProfile",
         "registeredOn":"registeredAt"
      },
      "user study":{
         newName:"UserStudy"
      },
      "user study progress":{
         newName:"UserStudyProgress"
      },
      "userpublications":{
         newName:"UserPublication",
         lastToughtAt: "lastTouchedAt"
      },
      "vocabulary":{
         newName:"Vocabulary"
      },
      "userstudystatistics":{
         newName:"UserStudyStatistics"
      }
   };
   module.exports = {
      process : function (doc) {
         var updated=false;
         if (doc.type && translate[doc.type]) {
            if(doc.type !== translate[doc.type].newName){
               doc.type = translate[doc.type].newName;
               updated = true;
            }
            for(var renameField in translate[doc.type]){
               if(translate[doc.type].hasOwnProperty(renameField) && renameField !== 'newName'){
                  doc[translate[doc.type][renameField]] = doc[renameField];
                  delete doc[renameField];
                  updated = true;
               }
            }
         }
         if(updated) {
            return doc;
         }
      }
   };
})();