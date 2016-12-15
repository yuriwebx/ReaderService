define(['module', 'swServiceFactory'],
        function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
       module : module,
       service : ['swUnifiedSettingsService', function(swUnifiedSettingsService) {
           
           this.getProfile = function(){
               var settings = swUnifiedSettingsService.getSetting('session', 'profile');
               var profile = settings || {firstName : "", lastName : ""};
               return profile;
           };
           
           this.setProfile = function(profile){
               var sessionGroup =  swUnifiedSettingsService.getGroup('session');
               sessionGroup.set('profile', profile);
               sessionGroup.save();
           };
      }]
   });
});
