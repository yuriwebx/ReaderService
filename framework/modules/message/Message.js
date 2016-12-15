define([], function()
{
   'use strict';
   
   function Message(type, text, params)
   {
      this.type = type;
      this.text = text;
      this.params = params;
      this.timestamp = new Date().getTime();
   }

   return Message;

});

