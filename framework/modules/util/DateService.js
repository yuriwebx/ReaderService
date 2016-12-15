define([

   'module', 'ngModule', 'moment', 'swLoggerFactory'
   
   ], function(

    module,   ngModule,   moment,   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.factory('swDateService', [function()
   {
      logger.trace('register');

      /**
       * Service which provides api for various date and time processing
       */
      function DateService()
      {
         // The following formats are of http://uk.wikipedia.org/wiki/ISO_8601.
         // They are hardcoded as they are used only for internal date/time representation.
         // Formats for screen/document date/time representation are provided by client
         // code via appropriate functions parameters (see below).   
         var dateFormat = 'YYYY-MM-DD';
         var timeFormat = 'HH:mm';
         var dttmFormat = 'YYYY-MM-DDTHH:mm';
         
         var INVALID_VALUE     = '?';
         var INVALID_VALUE_OUT = '?'; // must not be empty
         
         /**
          * return current date and time as object: {date, time, dttm}
          * where date - function, returns current date
          *       time - function, returns current time
          *       dttm - function, returns current dttm.
          */
         this.getCurrentDttm = function()
         {
            var dttm = moment().format(dttmFormat),
                date = dttm.substr(0, 10),
                time = dttm.substr(11, 5);
            
            return { date: function() { return date; },
                     time: function() { return time; },
                     dttm: function() { return dttm; }
                   };
         };
         
         /**
          * formats input into dttm according to specified outDttmFormat
          */
         this.formatDttm = function(dttm, outDttmFormat)
         {
            return moment(dttm, dttmFormat).format(outDttmFormat);
         };
         
         /**
          * formats input into date according to specified outDateFormat
          */
         this.formatDate = function(date, outDateFormat)
         {
            return date === INVALID_VALUE ? INVALID_VALUE_OUT : moment(date, dateFormat).format(outDateFormat);
         };
         
         /**
          * formats input into time according to specified outTimeFormat
          */
         this.formatTime = function(time, outTimeFormat)
         {
            return time === INVALID_VALUE ? INVALID_VALUE_OUT : moment(time, timeFormat).format(outTimeFormat);
         };
         
         /**
          * parses date from input according to specified format;
          * uses strict (not forgiving) parsing in case the last param is undefined or explicitly defined as true
          */
         this.parseDate = function(value, inDateFormat, strict)
         {
            var m = moment(value, inDateFormat, strict !== false);
            return m.isValid() ? m.format(dateFormat) : INVALID_VALUE;
         };
         
         /**
          * parses time from input according to specified format
          * uses strict (not forgiving) parsing in case the last param is undefined or explicitly defined as true
          */
         this.parseTime = function(value, inTimeFormat, strict)
         {
            var m = moment(value, inTimeFormat, strict !== false);
            return m.isValid() ? m.format(timeFormat) : INVALID_VALUE;
         };
         
         /**
          * return true if value is in correct internal format (date + optional time)
          */
         this.isDttmValid = function(dttm)
         {
            return dttm !== INVALID_VALUE && moment(dttm, dttmFormat).isValid();
         };
         
         /**
          * return true if value is in correct internal format
          */
         this.isTimeValid = function(time)
         {
            return time !== INVALID_VALUE && moment(time, timeFormat).isValid();
         };
         
         /**
          * return true if value is in specified format (internal format by default)
          */
         this.isDttmFormatValid = function(value, format)
         {
            return moment(value, format || dttmFormat, true).isValid();
         };
         
         /**
          * return true if value is in specified format (internal format by default)
          */
         this.isDateFormatValid = function(value, format)
         {
            return moment(value, format || dateFormat, true).isValid();
         };
         
         /**
          * return true if value is in specified format (internal format by default)
          */
         this.isTimeFormatValid = function(value, format)
         {
            return moment(value, format || timeFormat, true).isValid();
         };
         
         /**
          * Compose valid 'dttm' from 'date' and 'time'.
          * If date is empty then 'undefined' is returned.
          * If time is empty then just date (as it is) is returned.
          */
         this.toDttm = function(date, time)
         {
            return date ? (time ? date + 'T' + time : date) : undefined;
         };
         
         /**
          * Add specified units to 'dttm' (see moment#add).
          * return result in format that is appropriate for using with date/time
          * manipulation methods (add, isBefore, isAfter, isFuture, isPast etc)
          */
         this.add = function(dttm, unit, unitsNumber)
         {
            return moment(dttm).add(unitsNumber, unit).format(dttmFormat);
         };
         
         /**
          * Subtract specified units from 'dttm' (see moment#subtract).
          * return result in format that is appropriate for using with date/time
          * manipulation methods (add, isBefore, isAfter, isFuture, isPast etc)
          */
         this.subtract = function(dttm, unit, unitsNumber)
         {
            return moment(dttm).subtract(unitsNumber, unit).format(dttmFormat);
         };
         
         /**
          * return true if 'dttm1' is before the 'dttm2'.
          * If one of parameters is specified as date without time then
          * time part of another parameter is ignored in comparison.
          */
         this.isBefore = function(dttm1, dttm2)
         {
            // length === 10 means that time is not specified
            var unit = dttm1.length === 10 || dttm2.length === 10 ? 'day' : 'minute';
            return moment(dttm1).isBefore(dttm2, unit);
         };
         
         /**
          * return true if 'dttm1' is after the 'dttm2'
          * If one of parameters is specified as date without time then
          * time part of another parameter is ignored in comparison.
          */
         this.isAfter = function(dttm1, dttm2)
         {
            // length === 10 means that time is not specified
            var unit = dttm1.length === 10 || dttm2.length === 10 ? 'day' : 'minute';
            return moment(dttm1).isAfter(dttm2, unit);
         };
         
         /**
          * return true if 'dttm' is in future
          * If 'dttm' is specified as date without time then
          * current time is ignored in comparison.
          */
         this.isFuture = function(dttm)
         {
            return !this.isBefore(dttm, this.getCurrentDttm().dttm());
         };
         
         /**
          * return true if 'dttm' is in past
          * If 'dttm' is specified as date without time then
          * current time is ignored in comparison.
          */
         this.isPast = function(dttm)
         {
            return !this.isAfter(dttm, this.getCurrentDttm().dttm());
         };
         
      }
      
      return new DateService();

   }]);
});