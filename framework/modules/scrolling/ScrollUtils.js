/* jshint browser:true */
define([
   'module',
   'underscore',
   'swServiceFactory'

], function(
   module,
   _,
   swServiceFactory
) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function()
      {

         /* --- api --- */
         this.now       = now;
         this.momentum  = momentum;


         /* === impl === */

         function momentum(current, start, time, deceleration)
         {
            var distance = current - start,
               speed = Math.abs(distance) / time,
               destination,
               duration;

            deceleration = deceleration === undefined ? 0.0025 : deceleration;

            destination = current + ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
            duration = speed / deceleration;

            return {
               destination: Math.round(destination),
               duration: duration
            };
         }

         function now()
         {
            return _.result(window, 'performance.now') || Date.now();
         }
      }]
   });
});
