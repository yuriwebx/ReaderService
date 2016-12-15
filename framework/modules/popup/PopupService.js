/**

   Service intended to show/hide popups.
   
   Usage (see examples at pl/test/testpopup|testpopuplayout):
   
      swPopupService.show(options);
      
         options.scope (optional)
            Angular scope the popup content will be compiled in.
            If not specified then $rootScope used.
            The "scope.$new()" is used so original scope is not polluted.
            
         options.extendScope (object, optional)
            To extend the newly created popup scope (see above) if necessary.
            
         options.modal (optional)
            'false' by default
            
         options.target (optional)
            Element that was originated this popup showing.
            By default, all opened non-modal popups are closed when another
            popup to be shown.
            If "options.target" is specified then popups which contain it
            are not closed.
            
         options.requestFocus (optional)
            'true' by default
            If 'false' then focus is not requested to this popup.
            
         options.toggleId (optional)
            'undefined' by default
            All shown popups are closed before new popup showing.
            Then, if 'toggleId' is specified, check whether popup with the
            same 'toggleId' was just closed, and, if so, do not show new popup.
            
         options.backdropVisible (optional)
            'false' by default
            Forced to be 'true' if "modal".
            If 'true'  then screen outside the popup IS     grayed out.
            If 'false' then screen outside the popup is NOT grayed out.
            
         options.backdropEvents (optional)
            'false' by default
            Forced to be 'false' if "backdropVisible".
            Processed for non-modal popups only.
            If 'true' then click outside popup closes the popup AND immediately invokes
               some action related to the place where user clicked. Action is invoked only in case
               if $(event.target).closest('.sw-popup-backdrop-events-allowed').length > 0 
            If 'false' then click outside popup just closes the popup, nothing else.

         options.closeNonModals (optional)
            'true' by default
            By default, opening of any popup causes all non-modal popups to be closed.
            
         options.container (optional)
            Selector of DOM element where to append the popup content.
            By default, '.sw-popup-container'.
            If container not found then body is used.
            
         options.backdropContainer (optional)
            Selector of DOM element where to append the backdrop.
            By default, '.sw-popup-backdrop-container'.
            If container not found then body is used.
            
         options.template (string, optional)
            To override the default popup template if necessary.
              
         options.customClass (string, optional)
            To add to template root element.
            Also "customClass + '-arrow'" is added to arrow element. 
              
         options.header (string, optional)
            To replace the substring '<header-placeholder/>' in template.
             
         options.footer (string, optional)
            To replace the substring '<footer-placeholder/>' in template.
             
         options.content (string, optional)
            To replace the substring '<content-placeholder/>' in template.
             
         options.buttons (array, optional)
            Buttons to be displayed in popup.
            Each array element specifies one button as an object with the following properties:
               - name  (string, mandatory)
               - label (string, optional) language resource key, by default 'Popup.button.<name>.label'
               - icon  (string, optional) icon selector (see Button.html), by default 'i-<name>'
               - type  (string, mandatory) two types are currently supported: 'action' and 'standard'
               - disabled (boolean, optional) 
               - click (function, optional)
                    invoked when this button is clicked
                    if it returns 'false' then popup is not hidden, promise (see below) is not resolved
            Templates for all specified buttons (see Button.html file in this folder)
            are concatenated and inserted into template instead of '<buttons-placeholder/>' substring.
            Another way of buttons specification is predefined buttons (see below).
         
         options.<button> (function, optional)
            The following predefined buttons are supported: open, ok, submit, apply, yes, no, cancel, close.
            If 'options.<button>' function is specified then appropriate button is inserted into popup
            and this function is invoked when this button is clicked. If it returns 'false' then popup
            is not hidden, promise (see below) is not resolved.
            
         options.actions (array, optional)
            To define "active" elements in popup.
            The same structure as "options.buttons" (see above).
            The click on element (or one of its parent) having class "'sw-popup-' + action.name"
            is processed the same way as button specified via "options.buttons". 
            
         options.bodyOverflowHidden (boolean, optional) default: false
            To control body scrolling on/off.
            By default, when popup is shown body scrolling is turned off.
            ------------------------------------------
            TEMPORARILY disabled (scrolling always on)
            ------------------------------------------
         
         options.layout (object | function, optional)
            Controls the way how popup is located on screen.
            If specified as function then this function is invoked on each re-layouting,
               the result should be of the same structure as object.
            If "options.layout" is not specified
               then no programmatic locating is performed.
            "options.layout" properties:
               my (string, optional, case insensitive, default: 'CC')
                  Defines which position on the element being positioned to align with
                  the target element: "horizontal vertical" alignment.
                  Acceptable horizontal values: L|C|R (mean "left", "center", "right").
                  Acceptable vertical   values: T|C|B (mean "top",  "center", "bottom").
                  Example: "LT" or "CB".
               at (string, optional, case insensitive, default: 'CC')
                  Defines which position on the target element to align the positioned
                  element against: "horizontal vertical" alignment.
                  See the "my" option for full details on possible values.
               of (object, default: window)
                  Which element/point/rectangle to position against.
                  If "of" is HTMLElement then
                     the closest ".sw-popup-offset" is used if exists.
                  If "of" is {clientX: number, clientY: number, target: HTMLElement} then
                     target is optional and, if specified, is used to monitor scrolling
                     and calculate appropriate shifting
                  If "of" is {clientRect: {left: number, top: number, width: number, height: number}, target: HTMLElement} then
                     target is optional and, if specified, is used to monitor scrolling
                     and calculate appropriate shifting
               collision (Object|false, optional, default: all allowed)
                  flipHor:  true,
                  flipVer:  true,
                  rotate:   true,
                  shiftHor: true,
                  shiftVer: true,
                  When the positioned element overflows the window in some direction,
                  move it to an alternative position. All allowed options are tried
                  and best fitted variant is selected.
                  If it specified as "false" then all collision detection is turned off.
               within (default: window)
                  Element to position within, affecting collision detection.
                  Not supported so far.
               margin (Number|{left:Number,top:Number,right:Number,bottom:Number}, default: 10px along all sides)
                  "within" margins
                  isNumber(options.margin) means equal margins along all sides 
               arrow (boolean, default: false)
                  Draw arrow from "my" to "at"
               calculateSize (boolean, optional, default: true)
                  By default, popup size is calculated using header/content/footer sizes,
                  If specified as 'false' then this calculation is not performed and
                  the size of root popup element is used. 
               alignWidth
               alignHeight
                  set popup width/height to be the same as "of"  
                  
            For compatibility with previous version, if "options.layout.offset" is specified:        
               If "options.layout.offset" is "HTMLElement"
                  options.layout.my = 'RT';
                  options.layout.at = 'RB';
                  options.layout.of = options.offset;
               If "options.layout.offset" is "{clientX, clientY}" or {clientRect}
                  options.layout.my = 'CT';
                  options.layout.at = 'CB';
                  options.layout.of = options.offset;
                  options.layout.arrow = true;
         
         return an object with the following properties:
            promise:
               resolved on button click with button name
               ('undefined' on outside or cross sign click)
            readyPromise:
               resolved when popup is rendered on screen
            layout: function()
               invoke this function to re-layout the popup
            hide: function(value)
               invoke this function to hide the popup
               if "value" is specified ('undefined' allowed)
               then resolve "promise" with this "value",
               otherwise do not resolve "promise" at all 
            isHidden: function()
            
         The popup is hidden automatically when users clicks specified button
         or inside the area with class 'sw-popup-close' (autoclosing areas)
         or outside the non-modal popup contents.


      swPopupService.showDefaultBox(options)

         The particular case of generic 'show' method (see above).
         Uses predefined template and styles.


      swPopupService.showMessageBox(options)
      
         The particular case of generic 'show' method (see above).
         'options.content' and 'options.buttons' should be specified only.
         Uses predefined template and 'options.modal=true'.
         Can be hidden by specified buttons only.
         
         The following additional properties are supported:

         options.type (string, optional)
            Possible values:
            - 'confirmation' (default)
            - 'warning'
            - 'error'
            Does not affect buttons set and behavior but appearance only.
         
         options.error   (string or [string], optional)
         options.warning (string or [string], optional)
         options.content (string or [string], optional)
            Empty messages are skipped.
            All messages are concatenated using &lt;p> as separator.
            '\n' in messages is replaced with &lt;br>.
            Styles are setup so that &lt;p> introduces additional vertical
            space between messages.
            If at least one error is specified then options.type
            (by default) is set to 'error'.
            If no errors and at least one warning is specified then options.type
            (by default) is set to 'warning'.
            If no messages are specified then popup is not shown and method
            returns immediately with promise that resolved to 'undefined'.
         
         options.messages ([message], optional)
            mapped to options.error/warning according to message properties
               message (compatible to swI18nService.getResourceForMessage())
                  id        // optional
                  severity  // optional, 'ERROR'|'WARNING'
                  key       // optional, resource key ('id' used if 'key' not specified)
                  text      // optional, override 'key' if specified
                  params    // optional, for text interpolation
                  separator // optional, if 'true' then insert vertical space before this message


      swPopupService.showInfoBox(options)
      
         The particular case of generic 'show' method (see above).
         'options.content' should be specified only.
         'options.buttons' is optional.
         Uses predefined template and 'options.modal=false'.
         Can be hidden by specified button or by the click outside the popup contents.
   
      
      swPopupService.showContextMenu(options)
      
         The particular case of generic 'show' method (see above).
         Uses predefined template and 'options.modal=false'.
         Can be hidden by menu item click or by the click outside the popup contents.
         'options.contextMenuItems' should be specified.
         The structure of 'options.contextMenuItems' is the same as 'options.buttons'
         (see above)  
   
*/

define([

   'module',
   'swServiceFactory'

   ], function(

   module,
   swServiceFactory
   
   ){
   
   'use strict';
   
   swServiceFactory.create({
      module: module,
      service: [
                
            'swPopup',
            'swDefaultBox',
            'swMessageBox',
            'swInfoBox',
            'swContextMenu',
            
         function(
               
            swPopup,
            swDefaultBox,
            swMessageBox,
            swInfoBox,
            swContextMenu
            
         )
      {

         this.show = function(options)
         {
            return swPopup.show(options);
         };

         this.showDefaultBox = function(options)
         {
            return swDefaultBox.show(options);
         };
         
         this.showMessageBox = function(options)
         {
            return swMessageBox.show(options);
         };
         
         this.showInfoBox = function(options)
         {
            return swInfoBox.show(options);
         };
         
         this.showContextMenu = function(options)
         {
            return swContextMenu.show(options);
         };

      }]
   });
});
