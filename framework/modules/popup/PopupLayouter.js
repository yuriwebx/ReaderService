define([

   'module',
   'underscore',
   'jquery',
   'swLoggerFactory'

   ], function(

   module,
   _,
   $,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ////////////////////////////////////////////////////////////////////////////

   function _layout(_options)
   {
      var options = _.clone(_options);

      _normalize(options);

      _size(options);

      _locate(options);

      _css(options);
   }

   ////////////////////////////////////////////////////////////////////////////

   function _size(options)
   {
      _sizePopup(options);
      _sizeArrow(options);
   }

   function _sizePopup(options)
   {
      options.popupBox = {};

      var popupElement = options.popupElement;
      var popupBox = options.popupBox;

      popupBox.borderRadius = parseInt(popupElement.css('borderRadius'), 10) || 0;
      popupBox.position = popupElement.css('position');

      if ( options.calculateSize !== false )
      {
         popupElement.css('maxWidth',  options.within.w);
         popupElement.css('maxHeight', options.within.h);

         var of = _of(options);
         if ( options.alignWidth  && of.w > 0)
         {
            popupElement.outerWidth (of.w);
         }
         if ( options.alignHeight && of.h > 0 )
         {
            popupElement.outerHeight(of.h);
         }

         var headerElement = popupElement.find('.sw-popup-header');
         var footerElement = popupElement.find('.sw-popup-footer');
         var scrollableElement = popupElement.find('.sw-popup-content').closest('.sw-scrollable');
         scrollableElement.css('maxHeight', '');
         scrollableElement.css('maxHeight', popupElement.height() - (headerElement.outerHeight() + footerElement.outerHeight()));
         scrollableElement.trigger('sizeChange');
      }

      popupBox.w = popupElement.outerWidth();
      popupBox.h = popupElement.outerHeight();
   }

   function _sizeArrow(options)
   {
      options.arrowBox = {};

      options.arrowBox.position = options.arrowElement.css('position');

      var w = options.arrowElement.outerWidth();
      var h = options.arrowElement.outerHeight();

      if ( w >= h )
      {
         options.arrowBox.g = w; // greater dimension
         options.arrowBox.l = h; // less    dimension
      }
      else
      {
         options.arrowBox.g = h;
         options.arrowBox.l = w;
      }
   }

   ////////////////////////////////////////////////////////////////////////////

   function _locate(options)
   {
      var best;
      var skip = false;
      var end  = false;

      for ( var i = 0; !end; i++ )
      {
         if ( skip )
         {
            logger.trace(i, options.my, options.at, 'skip');
            skip = false;
         }
         else
         {
            //////////////////
            __locate(options);
            //////////////////

            var unfit = _checkCollision(options);
            logger.trace(i, options.my, options.at, unfit);

            if ( !best || best.unfit > unfit )
            {
               best = {
                  popupBox: _.clone(options.popupBox),
                  arrowBox: _.clone(options.arrowBox),
                  unfit: unfit
               };
            }

            if ( unfit === 0 )
            {
               break;
            }
         }

         switch ( i )
         {
            case 0: skip = _flipHor(options); break;
            case 1: skip = _flipVer(options); break;
            case 2: skip = _flipHor(options); break;
            case 3: end  = _rotate (options); break;
            case 4: skip = _flipHor(options); break;
            case 5: skip = _flipVer(options); break;
            case 6: skip = _flipHor(options); break;
            case 7: end  =  true;             break;
         }
      }

      options.popupBox = best.popupBox;
      options.arrowBox = best.arrowBox;

      _shift(options);
   }

   function __locate(options)
   {
      var of = _of(options);
      var at = _at(options, of);
      _locatePopup(options, at);
      _locateArrow(options, at, of);
   }

   function _checkCollision(options)
   {
      var v = options.within;
      var vx1 = v.x;
      var vy1 = v.y;
      var vx2 = v.x + v.w;
      var vy2 = v.y + v.h;

      var p = options.popupBox;
      var px1 = p.x;
      var py1 = p.y;
      var px2 = p.x + p.w;
      var py2 = p.y + p.h;

      var unfit = 0;

      if ( px1 < vx1 )
      {
         unfit += vx1 - px1;
      }
      if ( py1 < vy1 )
      {
         unfit += vy1 - py1;
      }
      if ( px2 > vx2 )
      {
         unfit += px2 - vx2;
      }
      if ( py2 > vy2 )
      {
         unfit += py2 - vy2;
      }

      return unfit;
   }

   function _flipHor(options)
   {
      if ( !options.collision.flipHor )
      {
         return true;
      }

      var c1 = options.my.charAt(1);
      var s1 = false;
      switch ( c1 )
      {
         case 'T': c1 = 'B';  break;
         case 'B': c1 = 'T';  break;
         case 'C': s1 = true; break;
      }
      options.my = options.my.charAt(0) + c1;

      var c2 = options.at.charAt(1);
      var s2 = false;
      switch ( c2 )
      {
         case 'T': c2 = 'B';  break;
         case 'B': c2 = 'T';  break;
         case 'C': s2 = true; break;
      }
      options.at = options.at.charAt(0) + c2;

      return s1 && s2;
   }

   function _flipVer(options)
   {
      if ( !options.collision.flipVer )
      {
         return true;
      }

      var c1 = options.my.charAt(0);
      var s1 = false;
      switch ( c1 )
      {
         case 'L': c1 = 'R';  break;
         case 'R': c1 = 'L';  break;
         case 'C': s1 = true; break;
      }
      options.my = c1 + options.my.charAt(1);

      var c2 = options.at.charAt(0);
      var s2 = false;
      switch ( c2 )
      {
         case 'L': c2 = 'R';  break;
         case 'R': c2 = 'L';  break;
         case 'C': s2 = true; break;
      }
      options.at = c2 + options.at.charAt(1);

      return s1 && s2;
   }

   function _rotate(options)
   {
      if ( !options.collision.rotate || options.at === 'CC' )
      {
         return true;
      }

      var my = options.my;
      var at = options.at;

      var myh = my.charAt(0);
      var myv = my.charAt(1);
      var ath = at.charAt(0);
      var atv = at.charAt(1);

      var _myh;
      var _myv;
      var _ath;
      var _atv;

      switch ( myh )
      {
         case 'L': _atv = 'B'; break;
         case 'C': _atv = 'C'; break;
         case 'R': _atv = 'T'; break;
      }
      switch ( myv )
      {
         case 'B': _ath = 'L'; break;
         case 'C': _ath = 'C'; break;
         case 'T': _ath = 'R'; break;
      }

      switch ( ath )
      {
         case 'L': _myv = 'B'; break;
         case 'C': _myv = 'C'; break;
         case 'R': _myv = 'T'; break;
      }
      switch ( atv )
      {
         case 'B': _myh = 'L'; break;
         case 'C': _myh = 'C'; break;
         case 'T': _myh = 'R'; break;
      }

      options.my = _myh + _myv;
      options.at = _ath + _atv;

      return options.my === my && options.at === at;
   }

   function _shift(options)
   {
      var v = options.within;
      var p = options.popupBox;
      var d;

      if ( options.collision.shiftHor )
      {
         d = p.x + p.w - v.x - v.w;
         if ( d > 0 )
         {
            p.x -= d;
            _shiftArrowHor(options);
            logger.trace('shiftHor', d);
         }
         d = p.x - v.x;
         if ( d < 0 )
         {
            p.x -= d;
            _shiftArrowHor(options);
            logger.trace('shiftHor', d);
         }
      }

      if ( options.collision.shiftVer )
      {
         d = p.y + p.h - v.y - v.h;
         if ( d > 0 )
         {
            p.y -= d;
            _shiftArrowVer(options);
            logger.trace('shiftVer', d);
         }
         d = p.y - v.y;
         if ( d < 0 )
         {
            p.y -= d;
            _shiftArrowVer(options);
            logger.trace('shiftVer', d);
         }
      }
   }

   function _shiftArrowHor(options)
   {
      options.arrowBox.displayFlag = options.arrowBox.displayFlag &&
         (options.arrowBox.dir === 'U' || options.arrowBox.dir === 'D');
   }

   function _shiftArrowVer(options)
   {
      options.arrowBox.displayFlag = options.arrowBox.displayFlag &&
         (options.arrowBox.dir === 'L' || options.arrowBox.dir === 'R');
   }

   ////////////////////////////////////////////////////////////////////////////

   function _locatePopup(options, at)
   {
      var pb = options.popupBox;

      switch ( options.my.charAt(0) )
      {
         case 'L': pb.x = at.x;            break;
         case 'R': pb.x = at.x - pb.w;     break;
         case 'C': pb.x = at.x - pb.w / 2; break;
      }
      switch ( options.my.charAt(1) )
      {
         case 'T': pb.y = at.y;            break;
         case 'B': pb.y = at.y - pb.h;     break;
         case 'C': pb.y = at.y - pb.h / 2; break;
      }
   }

   function _locateArrow(options, at, of)
   {
      var arrowParams;
      if ( !options.arrow || !(arrowParams = _AtMyToArrowParams[options.at + '-' + options.my]) )
      {
         options.arrowBox.displayFlag = false;
         return;
      }

      options.arrowBox.displayFlag = true;

      var w = options.popupBox.w;
      var h = options.popupBox.h;

      var mydx;
      var mydy;
      switch ( options.my.charAt(0) )
      {
         case 'L':
         case 'R': mydx = w / 2; break;
         case 'C': mydx = w / 4; break;
      }
      switch ( options.my.charAt(1) )
      {
         case 'T':
         case 'B': mydy = h / 2; break;
         case 'C': mydy = h / 4; break;
      }

      var atdx;
      var atdy;
      switch ( options.at.charAt(0) )
      {
         case 'L':
         case 'R': atdx = of.w / 2; break;
         case 'C': atdx = of.w / 4; break;
      }
      switch ( options.at.charAt(1) )
      {
         case 'T':
         case 'B': atdy = of.h / 2; break;
         case 'C': atdy = of.h / 4; break;
      }

      var adx = Math.min(mydx, atdx);
      var ady = Math.min(mydy, atdy);

      var ag = options.arrowBox.g;
      var al = options.arrowBox.l;

      var r = options.popupBox.borderRadius;
      var zx = Math.max(ag / 2 + r - adx, 0);
      var zy = Math.max(ag / 2 + r - ady, 0);

      if ( zx < adx )
      {
         adx += zx;
         zx = 0;
      }
      else
      {
         zx  -= adx;
         adx += adx;
      }

      if ( zy < ady )
      {
         ady += zy;
         zy = 0;
      }
      else
      {
         zy  -= ady;
         ady += ady;
      }

      var f = 0;
      var arrowOffsetDir = arrowParams.charAt(1);
      switch ( arrowOffsetDir )
      {
         case '+': f =  1; break;
         case '-': f = -1; break;
      }

      var ax;
      var ay;
      var dx;
      var dy;

      options.arrowBox.dir = arrowParams.charAt(0);
      switch ( options.arrowBox.dir )
      {
         case 'U':
            ax = at.x - ag / 2 + f * adx;
            ay = at.y;
            dx = -f * zx;
            dy = al;
            break;
         case 'D':
            ax = at.x - ag / 2 + f * adx;
            ay = at.y - al;
            dx = -f * zx;
            dy = -al;
            break;
         case 'L':
            ax = at.x;
            ay = at.y - ag / 2 + f * ady;
            dx = al;
            dy = -f * zy;
            break;
         case 'R':
            ax = at.x - al;
            ay = at.y - ag / 2 + f * ady;
            dx = -al;
            dy = -f * zy;
            break;
      }

      options.arrowBox.x = ax;
      options.arrowBox.y = ay;

      options.popupBox.x += dx;
      options.popupBox.y += dy;
   }

   ////////////////////////////////////////////////////////////////////////////

   function _css(options)
   {
      _cssPopup(options);
      _cssArrow(options);
   }

   function _cssPositionForBox(options, box)
   {
      var left = box.x,
          top  = box.y;

      if ( box.position !== 'fixed' || options.scroll.translate )
      {
         left  += options.scroll.left;
         top   += options.scroll.top;
      }

      top = Math.floor(top); // TODO discuss this with iplo@isd.dp.ua when frameworks will be merged

      return {
         left  : left,
         top   : top
      };
   }

   function _cssPopup(options)
   {
      options.popupElement.css(_cssPositionForBox(options, options.popupBox));
   }

   function _cssArrow(options)
   {
      var css = _cssPositionForBox(options, options.arrowBox);
      css.display = options.arrowBox.displayFlag ? 'block' : 'none';
      options.arrowElement.css(css);

      options.arrowElement.removeClass('sw-popup-arrow-left' );
      options.arrowElement.removeClass('sw-popup-arrow-right');
      options.arrowElement.removeClass('sw-popup-arrow-up'   );
      options.arrowElement.removeClass('sw-popup-arrow-down' );

      options.arrowElement.addClass   ('sw-popup-arrow-' + {
         'U': 'up',
         'D': 'down',
         'L': 'left',
         'R': 'right'
      }[options.arrowBox.dir]);
   }

   ////////////////////////////////////////////////////////////////////////////

   var _origTargetOffset;

   function _adjustToCurrentTargetOffset(options, xy)
   {
      if ( _.isElement(options.of.target) )
      {
         if ( options.firstFlag )
         {
            _origTargetOffset = $(options.of.target).offset();
            _origTargetOffset.top   -= options.scroll.top;
            _origTargetOffset.left  -= options.scroll.left;
            xy.y += options.scroll.top;
            xy.x += options.scroll.left;
         }
         else
         {
            var currTargetOffset = $(options.of.target).offset();

            xy.x += currTargetOffset.left - _origTargetOffset.left;
            xy.y += currTargetOffset.top  - _origTargetOffset.top;
         }
      }
   }

   ////////////////////////////////////////////////////////////////////////////

   function _of(options)
   {
      var r;
      if ( !_.isUndefined(options.of) &&
           !_.isUndefined(options.of.clientX) &&
           !_.isUndefined(options.of.clientY) )
      {
         r = {
            x: options.of.clientX - options.scroll.left,
            y: options.of.clientY - options.scroll.top,
            w: 0,
            h: 0
         };
         _adjustToCurrentTargetOffset(options, r);
      }
      else if ( !_.isUndefined(options.of) &&
                !_.isUndefined(options.of.clientRect) )
      {
         r = {
            x: options.of.clientRect.left,
            y: options.of.clientRect.top,
            w: options.of.clientRect.width,
            h: options.of.clientRect.height
         };
      }
      else if ( _.isElement(options.of) )
      {
         var $of = $(options.of);
         var $closest = $of.closest('.sw-popup-offset');
         $of = $closest.length ? $closest : $of;
         var offset = $of.offset();
         r = {
            x: offset.left >= options.scroll.left ? offset.left - options.scroll.left : offset.left,
            y: offset.top  >= options.scroll.top && !options.scroll.translate  ? offset.top  - options.scroll.top  : offset.top,
                                                    //TODO: "&& !options.scroll.translate" temporary fix will be removed after implementation the standard scroll in the reader
            w: $of.outerWidth(),
            h: $of.outerHeight()
         };
      }
      else
      {
         r = _.clone(options.within);
      }
      return r;
   }

   function _at(options, r)
   {
      var p = {};
      switch ( options.at.charAt(0) )
      {
         case 'L': p.x = r.x;           break;
         case 'R': p.x = r.x + r.w;     break;
         case 'C': p.x = r.x + r.w / 2; break;
      }
      switch ( options.at.charAt(1) )
      {
         case 'T': p.y = r.y;           break;
         case 'B': p.y = r.y + r.h;     break;
         case 'C': p.y = r.y + r.h / 2; break;
      }
      return p;
   }

   ////////////////////////////////////////////////////////////////////////////

   function _normalize(options)
   {
      ///////////////////////////////////////////
      // for compatibility with previous version
      // when there was the only layout option
      // "offset" and predefined positioning

      if ( options.offset )
      {
         if ( _.has(options.offset, 'clientX') || _.has(options.offset, 'clientRect') )
         {
            options.my = 'CT';
            options.at = 'CB';
            options.of = options.offset;
            options.arrow = true;
         }
         else
         {
            options.my = 'RT';
            options.at = 'RB';
            options.of = options.offset;
         }
      }

      ///////////////////////////////////////////

      var marginDefault;
      var margin;
      if ( _.isNumber(options.margin) )
      {
         marginDefault = options.margin;
         margin = {
            left:   marginDefault,
            top:    marginDefault,
            right:  marginDefault,
            bottom: marginDefault
         };
      }
      else
      {
         marginDefault = 10;
         margin = _.defaults(options.margin || {}, {
            left:   marginDefault,
            top:    marginDefault,
            right:  marginDefault,
            bottom: marginDefault
         });
      }

      options.within = {
         x: margin.left,
         y: margin.top,
         w: options.viewport.width  - (margin.left + margin.right),
         h: options.viewport.height - (margin.top + margin.bottom)
      };

      ///////////////////////////////////////////

      if ( options.collision === false )
      {
         options.collision = {
            flipHor:  false,
            flipVer:  false,
            rotate:   false,
            shiftHor: false,
            shiftVer: false
         };
      }
      else
      {
         options.collision = _.defaults(options.collision || {}, {
            flipHor:  true,
            flipVer:  true,
            rotate:   true,
            shiftHor: true,
            shiftVer: true
         });
      }

      ///////////////////////////////////////////

      options.my = (options.my || 'CC').toUpperCase();
      switch ( options.my.charAt(0) )
      {
         case 'L':
         case 'C':
         case 'R': break;
         default : throw new Error('incorrect options.my', options.my);
      }
      switch ( options.my.charAt(1) )
      {
         case 'T':
         case 'C':
         case 'B': break;
         default : throw new Error('incorrect options.my', options.my);
      }

      ///////////////////////////////////////////

      options.at = (options.at || 'CC').toUpperCase();
      switch ( options.at.charAt(0) )
      {
         case 'L':
         case 'C':
         case 'R': break;
         default : throw new Error('incorrect options.at', options.at);
      }
      switch ( options.at.charAt(1) )
      {
         case 'T':
         case 'C':
         case 'B': break;
         default : throw new Error('incorrect options.at', options.at);
      }
   }

   ////////////////////////////////////////////////////////////////////////////

   // at-my -> [U|D|L|R] [+|-]
   // [U|D|L|R] - arrow direction (Up/Down/Left/Right)
   // [-|+] arrow offset from "at" point (up/down for horizontal arrow, left/right for vertical arrow)
   // 'empty' means no arrow
   var _AtMyToArrowParams = {

      'LB-LT': 'U+',
      'LB-CT': 'U+',
//    'LB-RT': '',
      'LB-LB': 'D+',
      'LB-CB': 'D+',
      'LB-RB': 'R-',
      'LB-RC': 'R-',
      'LB-LC': 'L-',

      'CB-LT': 'U+',
      'CB-CT': 'U ',
      'CB-RT': 'U-',
      'CB-LB': 'D+',
      'CB-CB': 'D ',
      'CB-RB': 'D-',
//    'CB-RC': '',
//    'CB-LC': '',

//    'RB-LT': '',
      'RB-CT': 'U-',
      'RB-RT': 'U-',
      'RB-LB': 'L-',
      'RB-CB': 'D-',
      'RB-RB': 'D-',
      'RB-RC': 'R-',
      'RB-LC': 'L-',

      'LC-LT': 'L+',
//    'LC-CT': '',
      'LC-RT': 'R+',
      'LC-LB': 'L-',
//    'LC-CB': '',
      'LC-RB': 'R-',
      'LC-RC': 'R ',
      'LC-LC': 'L ',

      'RC-LT': 'L+',
//    'RC-CT': '',
      'RC-RT': 'R+',
      'RC-LB': 'L-',
//    'RC-CB': '',
      'RC-RB': 'R-',
      'RC-RC': 'R ',
      'RC-LC': 'L ',

      'LT-LT': 'U+',
      'LT-CT': 'U+',
      'LT-RT': 'R+',
      'LT-LB': 'D+',
      'LT-CB': 'D+',
//    'LT-RB': '',
      'LT-RC': 'R+',
      'LT-LC': 'L+',

      'CT-LT': 'U+',
      'CT-CT': 'U ',
      'CT-RT': 'U-',
      'CT-LB': 'D+',
      'CT-CB': 'D ',
      'CT-RB': 'D-',
//    'CT-RC': '',
//    'CT-LC': '',

      'RT-LT': 'L+',
      'RT-CT': 'U-',
      'RT-RT': 'U-',
//    'RT-LB': '',
      'RT-CB': 'D-',
      'RT-RB': 'D-',
      'RT-RC': 'R+',
      'RT-LC': 'L+'

   };

   ////////////////////////////////////////////////////////////////////////////

   return {
      layout: _layout
   };

   ////////////////////////////////////////////////////////////////////////////

});
