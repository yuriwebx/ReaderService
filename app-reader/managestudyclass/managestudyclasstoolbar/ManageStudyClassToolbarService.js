define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {
         var _buttons,
             _buttonsVisibility,
             _buttonsDeeplinkMap,
             onStudyPublicationFn;

         _buttons = [
            'Library',
            'ResumeStudy'
         ];

         _buttonsVisibility = {
            'Library'      : true,
            'ResumeStudy' : true
         };

         //TODO: make two different maps
         _buttonsDeeplinkMap = {
            'Library'      : '/managepublications',
            'ResumeStudy' : onStudyPublication
         };

         this.getButtons = function() {
            return _buttons;
         };
         
         this.getButtonRequired = function(buttonName) {
            return _buttonsVisibility[buttonName];
         };

         this.getButtonDeepLink = function(buttonName) {
            if ( typeof _buttonsDeeplinkMap[buttonName] === 'function' ) {
               _buttonsDeeplinkMap[buttonName]();
            }
            else {
               return _buttonsDeeplinkMap[buttonName];
            }
         };

         this.setOnStudyPublicationFn = function (fn) {
            onStudyPublicationFn = fn;
         };

         function onStudyPublication () {
            if (typeof onStudyPublicationFn === 'function') {
               onStudyPublicationFn();
            }
         }
      }]
   });
});