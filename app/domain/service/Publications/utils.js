/* global DataView: false */
/* global FileReader: false */
/* global ArrayBuffer: false */
/* global Uint8Array: false */

define([
   'q'
], function (q) {
   'use strict';

   var api = {
      parseContent : parseContent,
      parseAudioIndex : parseAudioIndex,
      PublicationPresentation : PublicationPresentation,
      defaultCategories : [{
         name : 'Important',
         color : '#fff499',
         nightColor: '#a48d2a',
         preset : true
      }, {
         name : 'Date',
         color : '#e3ffb1',
         nightColor: '#4d5a31',
         preset : true
      }, {
         name : 'Name',
         underline: 'pencilUnderline',
         color : '#ffccc4',
         nightColor: '#9f3224',
         preset : true
      }, {
         name : 'Place',
         underline: 'penUnderline',
         color : '#ffdca4',
         nightColor: '#b65434',
         preset : true
      }]
   };

   function parseContent (contentIndex, data, publicationPresentation) {
      var deferred = q.defer();
      var fr = new FileReader();
      var readAll = function readAll () {
         publicationPresentation.content = new Uint8Array(this.result);
         publicationPresentation.index = contentIndex;
         deferred.resolve(publicationPresentation);
      };
      if (data instanceof ArrayBuffer) {
         readAll.apply({result : data});
      }
      else {
         fr.onerr = deferred.reject;
         fr.onloadend = readAll;
         fr.readAsArrayBuffer(data);
      }
      return deferred.promise;
   }

   function parseAudioIndex (data, publicationPresentation) {
      var deferred = q.defer();
      var fr = null;
      if (data instanceof ArrayBuffer) {
         parseRawIndex(data, publicationPresentation.audio);
         deferred.resolve(publicationPresentation);
      }
      else {
         fr = new FileReader();
         fr.onloadend = function frOnloadend () {
            parseRawIndex(this.result, publicationPresentation.audio);
            deferred.resolve(publicationPresentation);
         };
         fr.onerr = deferred.reject;
         fr.readAsArrayBuffer(data);
      }
      return deferred.promise;
   }

   function parseRawIndex (arraybuffer, result) {
      var dataView = new DataView(arraybuffer);
      var value, index, valueSize, totalSize = 0;
      var FRAME_SIZE = 14;
      var FRAME_LENGTH = 5;

      if (arraybuffer.byteLength % FRAME_SIZE) {
         throw new Error('Invalid audio index buffer size');
      }
      for (var i = 0, l = (arraybuffer.byteLength / FRAME_SIZE) * FRAME_LENGTH; i < l; i++) {
         index = Math.floor(i / FRAME_LENGTH);
         valueSize = i - FRAME_LENGTH * index < 3 ? 2 : 4;
         value = dataView['getInt' + valueSize * 8](totalSize);

      if (valueSize === 4) {
         if (result.offsets[index]) {
            result.offsets[index][1] = value;
         }
         else {
            result.offsets[index] = [value];
         }
      }
      else if (result.locators[index]) {
         result.locators[index] += '.' + value;
      }
      else {
         result.locators[index] = value;
      }
      totalSize += valueSize;
      }
   }

   function PublicationPresentation () {
      this.content = [];
      this.details = {};
      this.materials = {
         categories : api.defaultCategories
      };
      this.audio = {
         offsets : [],
         locators : [],
         diff : []
     };
   }

   return api;

});