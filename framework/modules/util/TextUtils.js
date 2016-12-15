define([], function () {
   'use strict';

   function getTextColor(backgroundColor) {
      var rgb = backgroundColor.split(/(?=(?:..)+$)/).map(function(color) {
         return parseInt(color, 16);
      });
      // counting the perceptive luminance - human eye favors green color
      var luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      var color = luminance > 0.5 ? 'black' : 'white';
      return {
         rgb : rgb,
         color : color
      };
   }

   return {
      getTextColor: getTextColor
   };
});