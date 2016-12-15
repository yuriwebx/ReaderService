/*
    jQuery Masked Input Plugin
    Copyright (c) 2007 - 2014 Josh Bush (digitalbush.com)
    Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license)
    Version: 1.4.0
*/
!function(factory) {
    "function" == typeof define && define.amd ? define([ "jquery" ], factory) : factory("object" == typeof exports ? require("jquery") : jQuery);
}(function($) {
    var ua = navigator.userAgent, iPhone = /iphone/i.test(ua), chrome = /chrome/i.test(ua), android = /android/i.test(ua);
    $.mask = {
        definitions: {
            "9": "[0-9]",
            a: "[A-Za-z]",
            "*": "[A-Za-z0-9]"
        },
        //ogol -- new setting. all depending code is also custom
        shiftByUnit: true,
        autoclear: !0,
        dataName: "rawMaskFn",
        placeholder: "_"
    }, $.fn.extend({
        caret: function(begin, end) {
            var range;
            if (0 !== this.length && !this.is(":hidden")) return "number" == typeof begin ? (end = "number" == typeof end ? end : begin, 
            this.each(function() {
                this.setSelectionRange ? this.setSelectionRange(begin, end) : this.createTextRange && (range = this.createTextRange(), 
                range.collapse(!0), range.moveEnd("character", end), range.moveStart("character", begin), 
                range.select());
            })) : (this[0].setSelectionRange ? (begin = this[0].selectionStart, end = this[0].selectionEnd) : 
               document.selection && document.selection.createRange && (range = document.selection.createRange(), 
               begin = 0 - range.duplicate().moveStart("character", -1e5), end = begin + range.text.length), 
            {
                begin: begin,
                end: end
            });
        },
        unmask: function() {
            return this.trigger("unmask");
        },
        mask: function(mask, settings) {
            var input, defs, tests, partialPosition, firstNonMaskPos, lastRequiredNonMaskPos, len, oldVal;
            if (!mask && this.length > 0) {
                input = $(this[0]);
                var fn = input.data($.mask.dataName);
                return fn ? fn() : void 0;
            }
            return settings = $.extend({
                shiftByUnit: $.mask.shiftByUnit,
                autoclear: $.mask.autoclear,
                placeholder: $.mask.placeholder,
                completed: null
            }, settings), defs = $.mask.definitions, tests = [], partialPosition = len = mask.length, 
            firstNonMaskPos = null, $.each(mask.split(""), function(i, c) {
                "?" == c ? (len--, partialPosition = i) : defs[c] ? (tests.push(new RegExp(defs[c])), 
                null === firstNonMaskPos && (firstNonMaskPos = tests.length - 1), partialPosition > i && (lastRequiredNonMaskPos = tests.length - 1)) : tests.push(null);
            }), this.trigger("unmask").each(function() {
                function tryFireCompleted() {
                    if (settings.completed) {
                        for (var i = firstNonMaskPos; lastRequiredNonMaskPos >= i; i++) if (tests[i] && buffer[i] === getPlaceholder(i)) return;
                        settings.completed.call(input);
                    }
                }
                function getPlaceholder(i) {
                    return settings.placeholder.charAt(i < settings.placeholder.length ? i : 0);
                }
                function seekNext(pos) {
                   for (;++pos < len && !tests[pos]; ) ;
                   return pos;
                }
                function seekPrev(pos) {
                   for (;--pos >= 0 && !tests[pos]; ) ;
                   return pos;
                }
                
                function seekNextUnitStart(pos) {
                   var unitEnd = seekUnitRightBound(pos);
                   return unitEnd >= len ? pos : seekNext(unitEnd);
                }
                function seekPrevUnitStart(pos) {
                   return pos === 0 ? pos : seekUnitLeftBound(seekPrev(seekUnitLeftBound(pos)));
                }
                
                function seekUnitRightBound(pos) {
                   if(!tests[pos]) return pos;
                   for (;++pos < len && tests[pos]; ) ;
                   return pos;
                }
                function seekUnitLeftBound(pos) {
                   for (;--pos >= 0 && tests[pos]; ) ;
                   return ++pos;
                }

                function androidInputEvent() {
                    var curVal = input.val(), pos = input.caret();
                    if (curVal.length < oldVal.length) {
                        for (checkVal(!0); pos.begin > 0 && !tests[pos.begin - 1]; ) pos.begin--;
                        if (0 === pos.begin) for (;pos.begin < firstNonMaskPos && !tests[pos.begin]; ) pos.begin++;
                        input.caret(pos.begin, pos.begin);
                    } else {
                        for (checkVal(!0); pos.begin < len && !tests[pos.begin]; ) pos.begin++;
                        input.caret(pos.begin, pos.begin);
                    }
                    tryFireCompleted();
                }
                function blurEvent() {
                    checkVal(), input.val() != focusText && input.change();
                }
                function keydownEvent(e) {
                    if (!input.prop("readonly")) {
                        var pos, begin, end, k = e.which || e.keyCode;
                        oldVal = input.val(), 8 === k || 46 === k || iPhone && 127 === k ? 
                              (pos = input.caret(), begin = pos.begin, end = pos.end,
                              settings.shiftByUnit ? (begin = seekUnitLeftBound(begin), end = seekUnitRightBound(end)) :
                                    (end - begin === 0 && (begin = 46 !== k ? seekPrev(begin) : begin, end = 46 === k ? seekNext(end) : end)), 
                              clearBuffer(begin, end), writeBuffer(), input.caret(begin), e.preventDefault()) : 
                                 settings.shiftByUnit && (39 === k) ? (begin = seekNextUnitStart(input.caret().begin), 
                                       input.caret(begin, seekUnitRightBound(begin)), e.preventDefault()) :  
                                 settings.shiftByUnit && (37 === k) ? (begin = seekPrevUnitStart(input.caret().begin), 
                                       input.caret(begin, seekUnitRightBound(begin)), e.preventDefault()) :
                                 settings.shiftByUnit && (38 === k || 40 === k) ? e.preventDefault() : 13 === k ? blurEvent.call(this, e) : 
                                 27 === k && (input.val(focusText), input.caret(0, checkVal()), e.preventDefault());
                    }
                }
                function keypressEvent(e) {
                    if (!input.prop("readonly")) {
                        var p, c, next, k = e.which || e.keyCode, pos = input.caret();
                        if (!(e.ctrlKey || e.altKey || e.metaKey || 32 > k) && k && 13 !== k) {
                            if (pos.end - pos.begin !== 0 && (clearBuffer(pos.begin, pos.end)), 
                            p = seekNext(pos.begin - 1), len > p && (c = String.fromCharCode(k), tests[p].test(c))) {
                                if (buffer[p] = c, writeBuffer(), next = seekNext(p), android) { 
                                    var proxy = function() {
                                        $.proxy($.fn.caret, input, next)();
                                    };
                                    setTimeout(proxy, 0);
                                } 
                                else 
                                {
                                   if(settings.shiftByUnit && next === seekUnitLeftBound(next))
                                   {
                                      input.caret(next, seekUnitRightBound(next));
                                   }
                                   else if(settings.shiftByUnit && next === len)
                                   {
                                      input.caret(seekUnitLeftBound(next), next)
                                   }
                                   else
                                   {
                                      input.caret(next);
                                   }
                                } 
                                pos.begin <= lastRequiredNonMaskPos && tryFireCompleted();
                            }
                            e.preventDefault();
                        }
                    }
                }
                function clearBuffer(start, end) {
                    var i;
                    for (i = start; end > i && len > i; i++) tests[i] && (buffer[i] = getPlaceholder(i));
                }
                function writeBuffer() {
                    input.val(buffer.join(""));
                }
                
                function refreshModel()
                {
                   var i, c, pos, test = input.val(), lastMatch = -1;
                   for (i = 0, pos = 0; len > i; i++) if (tests[i]) {
                      c = test.charAt(++pos - 1);
                      if(tests[i].test(c))
                      {
                         buffer[i] = c;
                      }
                      else
                      {
                         buffer[i] = getPlaceholder(i);
                      }
                      lastMatch = i;
                   } 
                   else buffer[i] === test.charAt(pos) && pos++, partialPosition > i && (lastMatch = i);
                   
                   return lastMatch;
                }
                function checkVal(allow) {
                    var lastMatch = refreshModel();
                    return allow ? writeBuffer() : 
                       partialPosition > lastMatch + 1 ? settings.autoclear || buffer.join("") === defaultBuffer ? (input.val() && input.val(""), clearBuffer(0, len)) : writeBuffer() : 
                          (writeBuffer(), input.val(input.val().substring(0, lastMatch + 1))), 
                          partialPosition ? lastMatch + 1 : firstNonMaskPos;
                }
                var input = $(this), buffer = $.map(mask.split(""), function(c, i) {
                    return "?" != c ? defs[c] ? getPlaceholder(i) : c : void 0;
                }), defaultBuffer = buffer.join(""), focusText = input.val(), mouseoverbeforefocus = false;
                input.data($.mask.dataName, function() {
                    return $.map(buffer, function(c, i) {
                        return tests[i] && c != getPlaceholder(i) ? c : null;
                    }).join("");
                }), 
                input.one("unmask", function() {
                    input.off(".mask").removeData($.mask.dataName);
                }).on("focus.mask", function() {
                    if (!input.prop("readonly")) {
                        focusText = input.val();
                        refreshModel();
                        if(!settings.shiftByUnit)
                        {
                           input.caret(seekNext(-1));
                        }
                        else if(!mouseoverbeforefocus)
                        {
                           input.caret(seekNext(-1), seekUnitRightBound(seekNext(-1)));
                        }
                    }
                }).on("blur.mask", blurEvent).on("keydown.mask", keydownEvent).on("keypress.mask", keypressEvent)
                .on("input.mask paste.mask", function(e) {
                    input.prop("readonly") || setTimeout(function() {
                       checkVal(!0); tryFireCompleted();
                    }, 0);
                }),
                chrome && android && input.off("input.mask").on("input.mask", androidInputEvent);
                if(settings.shiftByUnit)
                {
                   input.on("mouseover", function() {
                      mouseoverbeforefocus = true;
                   });
                   input.on("mouseout", function() {
                      mouseoverbeforefocus = false;
                   });

                   input.on("mousedown.mask", function(e) {
                      input.on("mousemove.mask", function(e) {
                         e.preventDefault(); 
                      });
                   }).on("mouseup.mask", function() {
                      input.off("mousemove.mask");
                   }).on("click.mask", function(e){
                      if (!input.prop("readonly")) {
                         var pos = input.caret();
                         input.caret(seekUnitLeftBound(pos.begin), seekUnitRightBound(pos.begin));
                      }
                   });
                }
                checkVal(!0);
            });
        }
    });
});