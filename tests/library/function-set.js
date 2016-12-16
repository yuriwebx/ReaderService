var webdriver = require('selenium-webdriver');
var assert = require('assert');
var applicationArea, maxTimeout = 30000;

function findCss(driver, data) {
  return driver.findElement(byCss(data));
}
function findXpath(driver, data) {
  return driver.findElement(byXpath(data));
}
function findId(driver, data) {
  return driver.findElement(byId(data));
}
function findName(driver, data) {
  return driver.findElement(byName(data));
}

function waitLocator(driver, locator) {
  return driver.wait(webdriver.until.elementLocated(locator), maxTimeout);
}
function findLocator(driver, locator) {
  return driver.findElement(locator);
}
var InputBlockerLocator = webdriver.By.css('div.longRunningInputBlocker');
var OverlayLocator = 'webdriver.By.css(this.mappingData.common.Overlay)';

function _constant(obj) {
	return function() {
		return obj;
	}
}

function _identity(obj) {
	return obj;
}

function cascade() {
	var promises = [].slice(arguments, 0);
	var queue = promises.pop();
	while(promises.length) {
		queue = queue.then(promises.pop());
	}
	return queue;
}
	
function _findElements(driver, locator, condition)  {
	condition = condition || _identity;
	console.log('_findElements.start');
	
	return driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
		console.log('_findElements.inner');
	   return driver.findElements(locator).then(function(elements) {
		   return _preventInputBlocker(driver, InputBlockerLocator).then(function() {
			   return condition(elements);
		   });
	   });
	}, maxTimeout));
}

function _waitUntilPresent(driver, locator) {
	console.log('_waitUntilPresent.start');
	return driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
	   return driver.findElements(locator).then(function(bls) {
			console.log('_waitUntilPresent.wait.cond', bls.length);
			return !bls.length;
	   });
	}, maxTimeout));
}

function _preventInputBlocker(driver, InputBlockerLocator) {
	console.log('_preventInputBlocker.start');
	return driver.findElements(InputBlockerLocator).then(_wait);
	
	function _wait(blockers) {
		console.log('_preventInputBlocker.wait', blockers.length);
		if (blockers.length) {
			return _waitUntilPresent(driver, InputBlockerLocator);
		}
		return true;
	}
}

function _findAndClick(driver, locator) {
	console.log('_findAndClick.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndClick._condition', bls.length);
		if (bls.length) {
			return bls[0].click().then(_constant(bls));
		}
	}
}

function _findAndInput(driver, locator, text) {
	console.log('_findAndInput.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndInput._condition', bls.length);
		if (bls.length) {
			return bls[0].clear().then(function() {
				return bls[0].sendKeys(text).then(_constant(bls));
			});
		}
	}
}

function _findAndCompareText(driver, locator, text) {
	console.log('_findAndInput.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndInput._condition', bls.length);
		if (bls.length) {
			return bls[0].getText().then(function (_text) {
				//console.log('text--------  ',_text);
				assert.equal(_text.trim(), text.trim());
			}).then(_constant(bls));

		}
	}
}

function _findAndCompareInnerHtml(driver, locator, text) {
	console.log('_findAndInput.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndInput._condition', bls.length);
		if (bls.length) {
			return bls[0].getInnerHtml().then(function (_text) {
				assert.equal(_text.trim(), text.trim());
			}).then(_constant(bls));

		}
	}
}

function _findAndCompareValue(driver, locator, value) {
	console.log('_findAndInput.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndInput._condition', bls.length);
		if (bls.length) {
			return bls[0].getAttribute('value').then(function (_text) {
				assert.equal(_text.trim(), value.trim());
			}).then(_constant(bls));

		}
	}
}

function _findAndCompareHtml(driver, locator, value) {
	console.log('_findAndInput.start');
	return _findElements(driver, locator, _condition);
	
	function _condition(bls) {
		console.log('_findAndInput._condition', bls.length);
		if (bls.length) {
			return bls[0].getInnerHtml().then(function (_text) {
				assert.equal(_text.trim(), value.trim());
			}).then(_constant(bls));

		}
	}
}

function _preventInputBlockerMacroAndClick2(driver, locator, InputBlockerLocator) {
	return _findAndClick(driver, locator);
}

function _preventInputBlockerMacro2(driver, locator, InputBlockerLocator) {
	return _findElements(driver, locator);
}

function _preventInputBlockerAndInput2(driver, locator, InputBlockerLocator, value) {
	return _findElements(driver, locator).then(function(elements) {
		var element = elements[0];
		return element.clear().then(function(){
			return element.sendKeys(value);
		});
	});
}


  function preventInputBlockerMacroAndClick(driver, locator, InputBlockerLocator) {
	 return driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
		return driver.findElements(locator).then(function (els) {
		   if (!els.length) { 
			  return; 
		   } 
		   var element = els[0]; 
		   return driver.findElements(InputBlockerLocator).then(function (bls) {
			  if (!bls.length) {
				 return element; 
			  } 
		   }) 
		}); 
	 }),maxTimeout).then(function (element) {
		   return element.click(); 
		   },
		function (arr) {
		   var blocker = arr[0]; var element = arr[1];
		   return driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
			  return element.click();
		   }); 
		});         
  }

  function preventInputBlockerMacroAndInputValue(driver, locator, InputBlockerLocator, value) { 
	 return driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
		return driver.findElements(locator).then(function (els) { 
		   if (!els.length) { 
			  return; 
		   } 
		   var element = els[0]; 
		   return driver.findElements(InputBlockerLocator).then(function (bls) { 
			  if (!bls.length) { 
				 return element; 
			  } 
		   }) 
		}); 
	 }),maxTimeout).then(function (element) {
		return element.click(); 
	 }, function (arr) { 
		var blocker = arr[0]; var element = arr[1]; 
		return driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
		   return element.clear().then(function() {
			  return element.sendKeys(value); 
		   });
		}); 
	 });
  }
  function preventInputBlockerMacro(driver, locator, InputBlockerLocator) {     
	 return driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) {
		return driver.findElements(locator).then(function (els) {
		   if (!els.length) {
			  return; 
		   } 
		   var element = els[0]; 
		   return driver.findElements(InputBlockerLocator).then(function (bls) {
			  if (!bls.length) { 
				 return element; 
			  } 
		   }) 
		}); 
	 }),maxTimeout).then(function (element) {
		 return true;
		//element.click(); 
	 }, function (arr) { 
		var blocker = arr[0]; var element = arr[1]; 
		return driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
		   return element; 
		}); 
	 });
  }

function waitForEnableAndClick(driver, locator) {
  return driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) { 
		if (found) { 
		   return element.click(); 
		}
		return found;
	 }); 
  });      
}
function waitForEnable(driver, locator) {
  var el;
  //driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) {
		if (found) {
		   return element; 
		} 
	 });
	 //return element;
  });
//    return el;
}
function waitForVisible(driver, locator) {
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsVisible(element), maxTimeout)
	 .then(function (found) {
		if (found) {
		   return element; 
		} 
	 });
  });
}   
function waitForEnableAndCompareValue(driver, locator, text) {
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) { 
		if (found) { 
		   return element.getInnerHtml()
		   .then(function (value) { 
			  assert.equal(text, value); 
		   }); 
		} 
	 }); 
  });
}
function waitForEnableAndCompareValue2(driver, locator, text) {
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) { 
		if (found) { 
		   return element.getAttribute('value')
		   .then(function (value) { 
			  assert.equal(text, value); 
		   }); 
		} 
	 }); 
  });
} 
function waitForEnableAndCompareText(driver, locator, text) {
  waitLocator(driver, locator)
  .then(function (element) { 
	 driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) {
		if (found) { 
		   element.getText()
		   .then(function (value) { 
			  assert.equal(text, value); 
		   }); 
		} 
	 }); 
  });
}  
function waitForEnableAndClearValue(driver, locator) {   
  //driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) {
		if (found) {
		   return element.clear(); 
		} 
		return found;
	 }); 
  });
}  
function waitForEnableAndInputValue(driver, locator, value) {  
  //driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
  return waitLocator(driver, locator)
  .then(function (element) { 
	 return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
	 .then(function (found) {
		if (found) {
		   return element.sendKeys(value).then(function(v1) {

			return element.getAttribute('value').then(function(val) {
			//console.log('1--', v1, val);

			});
});

		}
		return found;
	 }); 
  });
}  


function getText(driver, locator) {
return waitLocator(driver, locator).then(function (element) { 
   return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
   .then(function(found) {
	  return element.getText();
   })
});	   
}


function byCss(data)
{
	return webdriver.By.css(data);
}
function byXpath(data)
{
	return webdriver.By.xpath(data);
}
function byId(data)
{
	return webdriver.By.id(data);
}
function byName(data)
{
	return webdriver.By.name(data);
}

function _findTextInDOM(driver, seartext, _detectDataLocator, i) {
  seartext = seartext.toLowerCase();
  console.log('findTextInDOM.start', i, seartext);

  var data = _detectDataLocator(i);
  var locator = byCss(data);

	return _findElements(driver, locator).then(function(elements) {
	  console.log('findTextInDOM.waitLocator.end');
	  var element = elements[0];
		return element.getText().then(function (text) {
			console.log('findTextInDOM.getText', text, ';');
			if (text.toLowerCase().indexOf(seartext) === -1) {
				return _findTextInDOM(driver, seartext, _detectDataLocator, i+1);
			}
			return element;
		});
	});
}

function _findHtmlInDOM(driver, seartext, _detectDataLocator, i) {
	seartext = seartext.toLowerCase();
  console.log('findTextInDOM.start', i, seartext);

  var data = _detectDataLocator(i);
  var locator = byCss(data);

	return _findElements(driver, locator).then(function(elements) {
	  console.log('findTextInDOM.waitLocator.end');
	  var element = elements[0];
		return element.getInnerHtml().then(function (text) {
			console.log('findTextInDOM.getInnerHtml', text, ';');
			if (text.toLowerCase().indexOf(seartext) === -1) {
				return _findTextInDOM(driver, seartext, _detectDataLocator, i+1);
			}
			return element;
		});
	});
}

function waitForEnableAndClickOrQuit(driver, locator) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) {
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) {
				if (found) { 
					element.click();
				} 
				else {
					driver.quit();
				} 
			}); 
		});
}


function _compareElements(driver, locator, comparator, message) {
	return _findElements(driver, locator).then(function(elements) {
		var promises = elements.map(comparator);
		return webdriver.promise.all(promises).then(function(results) {
			return results.every(function(b) {
				assert.equal(b, true, message);
				return b;
			});
		});
	});
}

module.exports = {
	_findTextInDOM: _findTextInDOM,
	_findHtmlInDOM : _findHtmlInDOM,
	byCss : byCss,
	byXpath : byXpath,
	byId : byId,
	byName : byName,
	getText : getText,
	waitForEnableAndInputValue : waitForEnableAndInputValue,
	waitForEnableAndClearValue : waitForEnableAndClearValue,
	waitForEnableAndCompareText : waitForEnableAndCompareText,
	waitForEnableAndCompareValue : waitForEnableAndCompareValue,
	waitForEnableAndCompareValue2 : waitForEnableAndCompareValue2,
	waitForEnable : waitForEnable,
	waitForEnableAndClick : waitForEnableAndClick,
	preventInputBlockerMacro : preventInputBlockerMacro,
	preventInputBlockerMacroAndInputValue : preventInputBlockerMacroAndInputValue,
	preventInputBlockerMacroAndClick : preventInputBlockerMacroAndClick,
	_preventInputBlockerAndInput2 : _preventInputBlockerAndInput2,
	_preventInputBlockerMacro2 : _preventInputBlockerMacro2,
	_preventInputBlockerMacroAndClick2 : _preventInputBlockerMacroAndClick2,
	_findAndClick : _findAndClick,
	_findAndInput : _findAndInput,
	_findAndCompareText: _findAndCompareText,
	_findAndCompareValue : _findAndCompareValue,
	_findAndCompareHtml : _findAndCompareHtml,
	_compareElements : _compareElements,
	_preventInputBlocker : _preventInputBlocker,
	_waitUntilPresent : _waitUntilPresent,
	_findElements : _findElements,
	findCss : findCss,
	findXpath : findXpath,
	findId : findId,
	findName : findName,
	waitLocator : waitLocator,
	findLocator : findLocator,
	waitForEnableAndClickOrQuit : waitForEnableAndClickOrQuit,
	_findAndCompareInnerHtml : _findAndCompareInnerHtml,
	waitForVisible : waitForVisible
};