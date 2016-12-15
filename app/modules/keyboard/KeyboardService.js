define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [swKeyboardService]
   });

   function swKeyboardService() {
      /*jshint validthis:true */
      var api = this;

      api.registry   = registry;
      api.unregistry = unregistry;
      api.process    = process;
      api.unprocess  = unprocess;
      api.setKeyboardToggle = setKeyboardToggle;
      api.keyboardToggle = keyboardToggle;

      /* === impl === */
      var _keyboard  = null,
          logger     = this.logger;

      function registry(keyboard) {
         _keyboard = keyboard;
      }

      function unregistry() {
         _keyboard = null;
      }

      function process(input) {
         if (_keyboard) {
            _keyboard.process(input);
         }
         else {
            logger.error('keyboard is not defined');
         }
      }

      function unprocess(input) {
         if (_keyboard) {
            _keyboard.unprocess(input);
         }
         else {
            logger.error('keyboard is not defined');
         }
      }

      var _toggle;
      function setKeyboardToggle (f) {
         _toggle = f;
      }

      function keyboardToggle () {
         if (typeof _toggle === 'function') {
            _toggle();
         }
      }

   }
});