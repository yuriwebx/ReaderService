/* jshint node: true */
/* jshint camelcase: false */
(function () {
   'use strict';
   var fs = require('fs');
   var fileContents = fs.readFileSync(__dirname + '/../../../../config/local.config.json');
   if (fileContents && fileContents.toString()) {
      try {
         var config = JSON.parse(fileContents.toString());
         if (!config || !config.hasOwnProperty('environment_name') || config.environment_name.indexOf('public') !== 0) {
            var usersToRemove =
               ["liliane.saberin@gmail.com", "chadananda@gmail.com", "djones1844@gmail.com", "katharine.phelps@gmail.com", "ghazala@firm-foundation.org",
                  "harris632@gmail.com", "georgevia@hotmail.com", "camthird@gmail.com", "deepali.jones@gmail.com", "gilbert.hakim@softcomputer.com"];

            module.exports = {
               process : function (doc) {
                  if (doc.type === 'UserProfile' && usersToRemove.indexOf(doc.email) !== -1) {
                     return 'delete';
                  }
               }
            };
         }
      }
      catch (e) {
         // do nothing
      }
   }
})();