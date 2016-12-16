/* jshint strict: true */
/* jshint unused:false */
/* jshint -W061 */
/* jshint -W097 */
/* jshint -W117 */
'use strict';
require('jasmine-before-all');
var webdriver = require('selenium-webdriver');
var Yadda = require('yadda');
var assert = require('assert');
var commonUtils = require('./function-set');

module.exports = (function () {

    var dictionary = new Yadda.Dictionary()
            .define('LOCALE', /(fr|es|ie)/)
            .define('NUM', /(\d+)/);

    var applicationArea, maxTimeout = 3000;

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
	/*var findCss = 'this.driver.findElement(byCss(data))',
            findXpath = 'this.driver.findElement(byXpath(data))',
            findId = 'this.driver.findElement(byId(data))',
            findName = 'this.driver.findElement(byName(data))',
            waitLocator = 'this.driver.wait(webdriver.until.elementLocated(locator),maxTimeout)',
            findLocator = 'this.driver.findElement(locator)';*/
	function waitLocator(driver, locator) {
		return driver.wait(webdriver.until.elementLocated(locator), maxTimeout);
	}
	function findLocator(driver, locator) {
		return driver.findElement(locator);
	}
	
    var InputBlockerLocator = 'webdriver.By.css(this.mappingData.common.InputBlocker)';
    var OverlayLocator = 'webdriver.By.css(this.mappingData.common.Overlay)';

    /*var waitForEnableAndClick = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { element.click(); } }); });";*/
	function waitForEnableAndClick(driver, locator) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) { 
				if (found) { 
					element.click(); 
				} 
			}); 
		});		
	}
    /*var waitForEnable = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { return found; } }); });";*/
	function waitForEnable(driver, locator) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) { 
					return found; 
				} 
			}); 
		});
	}		
    /*var waitForEnableAndCompareValue = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { element.getInnerHtml().then(function (value) { assert.equal(text, value); }); } }); });";*/
	function waitForEnableAndCompareValue(driver, locator, text) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) { 
				if (found) { 
					element.getInnerHtml()
					.then(function (value) { 
						assert.equal(text.trim(), value.trim()); 
					}); 
				} 
			}); 
		});
	}	
    /*var waitForEnableAndCompareText = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { element.getText().then(function (value) { assert.equal(text, value); }); } }); });";*/
	function waitForEnableAndCompareText(driver, locator, text) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) { 
				if (found) { 
					element.getText()
					.then(function (value) { 
						assert.equal(text.trim(), value.trim()); 
					}); 
				} 
			}); 
		});
	}	
    /*var waitForEnableAndClearValue = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { element.clear(); } }); });";*/
	function waitForEnableAndClearValue(driver, locator) {	
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) {
					element.clear(); 
				} 
			}); 
		});
	}	
    /*var waitForEnableAndInputValue = "driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (element) { driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout).then(function (found) { if (found) { element.sendKeys(value); } }); });";*/
	function waitForEnableAndInputValue(driver, locator, value) {	
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) {
					element.sendKeys(value); 
				} 
			}); 
		});
	}		
	/*var preventInputBlockerMacroAndClick = "var inputBlockerLocator = eval(InputBlockerLocator); driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { return driver.findElements(locator).then(function (els) { if (!els.length) { return; } var element = els[0]; return driver.findElements(inputBlockerLocator).then(function (bls) { if (!bls.length) { return element; } }) }); }),maxTimeout).then(function (element) { element.click(); }, function (arr) { var blocker = arr[0]; var element = arr[1]; driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () { element.click(); }); });";*/
	/*var preventInputBlockerMacroAndInputValue = "var inputBlockerLocator = eval(InputBlockerLocator); driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { return driver.findElements(locator).then(function (els) { if (!els.length) { return; } var element = els[0]; return driver.findElements(inputBlockerLocator).then(function (bls) { if (!bls.length) { return element; } }) }); }),maxTimeout).then(function (element) { element.click(); }, function (arr) { var blocker = arr[0]; var element = arr[1]; driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () { element.clear(); element.sendKeys(value); }); });";*/
	/*var preventInputBlockerMacro = "var inputBlockerLocator = eval(InputBlockerLocator); driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { return driver.findElements(locator).then(function (els) { if (!els.length) { return; } var element = els[0]; return driver.findElements(inputBlockerLocator).then(function (bls) { if (!bls.length) { return element; } }) }); }),maxTimeout).then(function (element) { element.click(); }, function (arr) { var blocker = arr[0]; var element = arr[1]; driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () { return element; }); });";*/

		function preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator) {
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
				return driver.findElements(locator).then(function (els) {
					if (!els.length) { 
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) {
						if (!bls.length) { 
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) { 
					element.click(); },
				function (arr) { 
					var blocker = arr[0]; var element = arr[1]; 
					driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
						element.click(); 
					}); 
				});			
		}
		function preventInputBlockerMacroAndInputValue(driver, locator, inputBlockerLocator, value) { 
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
				return driver.findElements(locator).then(function (els) { 
					if (!els.length) { 
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) { 
						if (!bls.length) { 
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) {
				element.click(); 
			}, function (arr) { 
				var blocker = arr[0]; var element = arr[1]; 
				driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
					element.clear(); element.sendKeys(value); 
				}); 
			});
		}
		function preventInputBlockerMacro(driver, locator, inputBlockerLocator) {		
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) {
				return driver.findElements(locator).then(function (els) {
					if (!els.length) {
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) {
						if (!bls.length) { 
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) {
				element.click(); 
			}, function (arr) { 
				var blocker = arr[0]; var element = arr[1]; 
				driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
					return element; 
				}); 
			});
		}
		
    function byCss(data) {
        return webdriver.By.css(data);
    }
    function byXpath(data) {
        return webdriver.By.xpath(data);
    }
    function byId(data) {
        return webdriver.By.id(data);
    }
    function byName(data) {
        return webdriver.By.name(data);
    }

    var library = new Yadda.localisation.English.library(dictionary)

//Scenario: Select data area
            .given("I select data area $area", function (area) {
                applicationArea = this.mappingData[area];//'this.mappingData.' + area;
            })
            .then("We should click top $menu", function (menu) {
                this.driver.findElement(webdriver.By.css(this.mappingData.admin[menu])).click();
            })

//Scenario: Test site opening and logon
            .given("Set test steps time", function () {
                //this.driver.manage().timeouts().implicitlyWait(maxTimeout);
                //this.driver.manage().timeouts().setScriptTimeout(2000);
                //this.driver.manage().timeouts().pageLoadTimeout(2000);
                //this.driver.manage().window().maximize();
            })
            .when("I open $link page", function (link) {
                var driver = this.driver;
                link = (link === 'url' ? this.environmentConfigData[link] + 'admin/index.html' : link);
                return driver.get(link).then(function() {
					return driver.wait(webdriver.until.titleIs(link), maxTimeout);
				});
            })
            .then("Main page should have $titleName title", function (titleName) {
                var driver = this.driver;
                titleName = (titleName === 'url' ? this.environmentConfigData[titleName] + 'admin/index.html' : titleName);
                /*driver.getTitle().then(function (title) {
                 //console.log('title='+title+' ='+titleName);
                 if (title !== titleName) {
                 throw new Error(
                 'Expected "' + titleName + '", but was "' + title + '"');
                 }
                 });*/
                return driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
            })
            .then("And we should see login form $LoginForm", function (LoginForm) {
                var driver = this.driver;
				driver.sleep(500);
                var data = applicationArea[LoginForm];//eval(applicationArea + '.' + LoginForm);
                var locator = byCss(data); //webdriver.By.css(this.mappingData.common[LoginForm]);
                /*this.driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
                        .then(function (found) {
                            //found;
                        });*/
				//preventInputBlockerMacro(driver, locator, eval(InputBlockerLocator));
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("user sees item list $BookList", function (BookList) {
                var data = applicationArea[BookList];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
            })

            .given("Should be input $value into $place", function (value, place) {
                var driver = this.driver;
                //driver.sleep(500);	// работает
                var locator = webdriver.By.css(this.mappingData.common[place]);
                /*driver.isElementPresent(locator).then(function(found) {		2-й способ
                 if (found) {
                 driver.findElement(locator).clear();
                 driver.findElement(locator).sendKeys(text);
                 }
                 });*/
                /*driver.wait(function() {	3-й способ
                 return driver.findElement(locator);
                 }, 500).then(function() {
                 driver.findElement(locator).clear();
                 driver.findElement(locator).sendKeys(text);
                 /*});*/
                /*driver.wait(webdriver.until.elementLocated(locator), 1500).then(function (found) {
                    found.clear();
                    found.sendKeys(text);
                });*/
				/*eval(waitForEnableAndClearValue);
				eval(waitForEnableAndInputValue);*/
				waitForEnableAndClearValue(driver, locator);
				waitForEnableAndInputValue(driver, locator, value);
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).clear();
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).sendKeys(text);
                //}
            })
            .then("Check $text existing in $place", function (text, place) {
                //return this.driver.findElement(webdriver.By.css(this.mappingData.common[place])) === text;
				var driver = this.driver;
                var data = applicationArea[place];
                var locator = byCss(data);//webdriver.By.css(data);
                //driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function() {
				waitLocator(driver, locator)
				.then(function (found) {
					found
						.getAttribute('value').then(function (value) {
						assert.equal(text, value);
					});
				});
				//eval(waitForEnableAndCompareValue);
				//waitForEnableAndCompareValue(driver, locator, text);
            })

            /*    .when("I press Enter on $form",function(form) {
             var driver = this.driver;
             driver.findElement(webdriver.By.css(this.mappingData.common[form])).submit();
             })*/
            .when("I press login button $LoginButton", function (LoginButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginButton])).click();
				var driver = this.driver;
                var data = applicationArea[LoginButton];
                var locator = byCss(data);
				//eval(waitForEnableAndClick);
				waitForEnableAndClick(driver, locator);
            })
            .then("We should see top menu $menu", function (menu) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[menu]));
                var locator = webdriver.By.css(this.mappingData.admin[menu]);
                var driver = this.driver;
                /*driver.wait(webdriver.until.elementLocated(locator), maxTimeout).then(function (found) {
                    //found;
                });*/
				waitForEnable(driver, locator);
            })
            /*.then("We should see $role button $button", function (role, button) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])) === role;
            })*/
            .then("We should see Edit button $button", function (button) {
                //this.driver.findElement(webdriver.By.xpath(this.mappingData.admin[button]));
				var driver = this.driver;
                var data = applicationArea[button];
                var locator = byXpath(data);
                waitForEnable(driver, locator);
            })

//Scenario: Test add user
            .when("I click add user $adduser", function (adduser) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[adduser])).click();
                //this.driver.sleep(1000);
                var data = eval(applicationArea + '.' + adduser);
                var element = eval(findCss);//.click();
                //this.driver.sleep(1000);
                //var driver = this.driver;
                this.driver.wait(function () {
                    //this.driver.findElement(webdriver.By.css(this.mappingData.admin[adduser])).click();
                    //var data = eval(applicationArea + '.' + adduser);
                    //eval(findCss).click();
                    element.click();
                }, 500);
            })
            .then("We should see $popup popup", function (popup) {
                this.driver.findElement(webdriver.By.css(this.mappingData.admin[popup]));
            })

            .when("Input $value into $textbox", function (value, textbox) {
                /*this.driver.findElement(webdriver.By.name(this.mappingData.admin[textbox])).clear();
                this.driver.findElement(webdriver.By.name(this.mappingData.admin[textbox])).sendKeys(value);*/
				var data = applicationArea[textbox];
                var locator = byName(data);
				var driver = this.driver;
				waitForEnableAndClearValue(driver, locator);
				waitForEnableAndInputValue(driver, locator, value);				
            })
            .then("We should see name $holder = $text", function (holder, text) {
                //return this.driver.findElement(webdriver.By.name(this.mappingData.admin[holder])) === text;
                var data = applicationArea[holder];
				var locator = byName(data);
				waitLocator(this.driver, locator)
				.then(function(found) {
					found
                        .getAttribute('value')
                        .then(function (value)
                        {
                            assert.equal(text, value);
                        });
				});
            })

            .when("Input email $value into $textbox", function (value, textbox) {
                /*this.driver.findElement(webdriver.By.css(this.mappingData.admin[textbox])).clear();
                this.driver.findElement(webdriver.By.css(this.mappingData.admin[textbox])).sendKeys(email);*/
				var data = applicationArea[textbox];
                var locator = byCss(data);
				var driver = this.driver;
				waitForEnableAndClearValue(driver, locator);
				waitForEnableAndInputValue(driver, locator, value);				
            })
            .then("We should see email $text = $email", function (text, email) {
                //return this.driver.findElement(webdriver.By.css(this.mappingData.admin[text])) === email;
                var data = applicationArea[text];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				findLocator(this.driver, locator)
				.then(function(found) {
					found
                        .getAttribute('value')
                        .then(function (value)
                        {
                            assert.equal(email, value);
                        });
				});
            })

            .when("I click on popup $action $button", function (action, button) {
                //this.driver.sleep(500);
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])).click();
				//console.log("I click on popup " + action + " " + button);
				var data = applicationArea[button];
                var locator = byCss(data);
				var driver = this.driver;
				//eval(waitForEnableAndClick);
				return commonUtils._findAndClick(driver, locator); //waitForEnableAndClick(driver, locator);
            })
            .then("We should see saved $saved = $text", function (saved, text) {
				//try {
					//console.log('We should see saved ' + saved + ' = text ' + text);
					var data = applicationArea[saved];
					var locator = byXpath(data);
					var driver = this.driver;
					//eval(preventInputBlockerMacro);
					////preventInputBlockerMacro(driver, locator, eval(InputBlockerLocator));
					//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
					return driver.sleep(1000).then( function() {
						return waitLocator(driver, locator)
						.then( function(found) {
							return found
								.getText()
								.then(function (value)
								{
									return assert.equal(text.trim(), value.trim());
								});
						});
					});
					//waitForEnableAndCompareText(driver, locator, text);
				/*}
				catch (err) {
					console.log("...We should see saved $saved = $text...", err.stack || String(err));
				}*/
            })
			
/*			
until.elementLocated = function(locator) {
  var locatorStr = goog.isFunction(locator) ? 'function()' : locator + '';
  return new until.Condition('element to be located by ' + locatorStr,
      function(driver) {
        return driver.findElements(locator).then(function(elements) {
          return elements[0];
        });
      });
};
*/
//Scenario: Test edit user
            .when("I click on Edit button $edit", function (edit) {
				var driver = this.driver;
				//var locator = webdriver.By.xpath(this.mappingData.admin[edit]);
				var data = applicationArea[edit];
				//console.log("**********        ",data);
				var locator = byXpath(data);
				//console.log("**********        ",locator);
				return commonUtils._findAndClick(driver, locator);
				/*return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					console.log("**********        ",element);
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});*/
            })
            .then("We should see Edit form $form", function (form) {
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.admin[form]);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })
            .when("I select role $button", function (button) {
				try {
					//this.driver.sleep(500);
					//this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])).click();
					var locator = webdriver.By.css(this.mappingData.admin[button]);
					var driver = this.driver;
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
					return commonUtils._findAndClick(driver, locator);
				}
				catch (err) {
					console.log("...I select role $button...", err.stack || String(err));
				}				
            })
            .then("We should see this role checked $checked", function (checked) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[checked]));
				var locator = webdriver.By.css(this.mappingData.admin[checked]);
				var driver = this.driver;
				waitForEnable(driver, locator);
            })
            .when("I select $password reset $button", function (password, button) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])).click();
				var data = applicationArea[button];
                var locator = byCss(data);
				var driver = this.driver;
				return commonUtils._findAndClick(driver, locator);
            })
            .then("We should see $password reset state changed $changed", function (password, changed) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[changed]));
				//console.log("We should see password reset state changed " + changed);
				var data = applicationArea[changed];
                var locator = byCss(data);
				var driver = this.driver;
				return commonUtils._findElements(driver, locator);
            })
            .when("I click on active switcher $ActiveSwitcher", function (ActiveSwitcher) {
                this.driver.findElement(webdriver.By.css(this.mappingData.admin[ActiveSwitcher])).click();
            })
            .then("We should see $some state $state", function (some, state) {
                this.driver.findElement(webdriver.By.css(this.mappingData.admin[state]));
            })

            .when("I click $button to submit form", function (button) {
				//this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])).click();
				var driver = this.driver;
				var data = applicationArea[button];
				var locator = byCss(data);
				return commonUtils._findAndClick(driver, locator);
				// waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
            })
            .then("We should see $role in row is $text", function (role, text) {
				//console.log('we should see ' + role + ' in row is ' + text);
                //this.driver.sleep(500);
                var driver = this.driver;
                var data = applicationArea[role];
                var locator = byXpath(data);
				waitForEnableAndCompareValue(driver, locator, text);
                //this.driver.wait(webdriver.until.elementLocated(locator));
                /*eval(waitLocator).then( function() {
                 //eval(findXpath)
                 eval(findLocator)
                 .getInnerHtml()
                 .then(function (value)
                 {
                 assert.equal(text, value);
                 });
                 });*/
            })
            .then("We should see $norole in row", function (norole) {
                //this.driver.sleep(500);
				//console.log("We should see " + norole + "in row");
                var data = applicationArea[norole];
				var driver = this.driver;
                var locator = byXpath(data);
                waitForEnable(driver, locator);				
            })
            .then("We should see user is absent", function () {
            })
            .then("We should see user list $UserList", function (UserList) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[UserList]));
                var data = applicationArea[UserList];
				var driver = this.driver;
                var locator = byCss(data);
                return commonUtils._findElements(driver, locator).then(function() {
					return driver.sleep(500);
				});
            })
			.then("We should see filter box $filter", function (filter) {
                var data = applicationArea[filter];
				var driver = this.driver;
                var locator = byCss(data);
                return commonUtils._findElements(driver, locator);
            })			

            .when("I click out of reader mode $outof", function (outof) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.reader[outof])).click();
				var data = applicationArea[outof];
				var driver = this.driver;
                var locator = byCss(data);
                waitForEnableAndClick(driver, locator);
            })
            .then("Menu is available", function () {

            })

            /*.when("I click on show menu $button", function(button) {
             this.driver.findElement(webdriver.By.css(this.mappingData.admin[button])).click();
             //this.driver.sleep(maxTimeout);
             })*/
            .when("I click toggle $ToggleMenuButton", function (ToggleMenuButton) {
                var data = applicationArea[ToggleMenuButton];
                var locator = byCss(data);
				var driver = this.driver;
				//waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				return waitLocator(driver, locator).then(function(element) {
					   var seq = new webdriver.ActionSequence(driver);
					   return seq.mouseMove(element).click().perform();
				});				
            })
            .then("$ToggleMenu is open and $Item item is in it", function (ToggleMenu, Item) {
				var driver = this.driver;
                var data = applicationArea[ToggleMenu];
				var locator = byCss(data);
				//waitForEnable(driver, locator);	
				return commonUtils._findElements(driver, locator).then(function(){
					data = applicationArea[Item];
					locator = byCss(data);
					return commonUtils._findElements(driver, locator);
				});
                
				//waitForEnable(driver, locator);	
				
            })

            .when("I click library item $Library", function (Library) {
                var data = applicationArea[Library];
				var locator = byCss(data);
				var driver = this.driver;
				waitForEnableAndClick(driver, locator);
            })
            .then("$titleName page is open", function (titleName) {
                var driver = this.driver;
                titleName = (this.mappingData.admin[titleName] === 'url' ? this.environmentConfigData.url + 'admin/#/libraryview' : titleName);
                driver.getTitle().then(function (title) {
                    //console.log('title=' + title + ' ..............  ' + titleName);
                    if (title !== titleName) {
                        throw new Error(
                                'Expected "' + titleName + '", but was "' + title + '"');
                    }
                });
            })

            .when("I click logout $button", function (button) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[button])).click();
                var data = applicationArea[button];
				var driver = this.driver;
				var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				return commonUtils._findAndClick(driver, locator);
            })
            .then("We log out", function () {

            })

            .when("I click on filter box $FilterBox", function (FilterBox) {
				//this.driver.sleep(1000);
				var data = applicationArea[FilterBox];
				var locator = byCss(data);
				var driver = this.driver;
				waitForEnableAndClick(driver, locator);
            })
            .then("Something happens", function () {
				//this.driver.sleep(1000);
            })

            .given("I input $LastName in $FilterBox", function (LastName, FilterBox) {
                //this.driver.sleep(1000);
                var data = applicationArea[FilterBox];
				var locator = byCss(data);
				var driver = this.driver;
				var value = LastName;// + FirstName;
				return commonUtils._findAndInput(driver, locator, value).then(function() {
					return driver.sleep(200);
				});
            })
            .then("We should see user where $UserFound = $LastName $FirstName", function (UserFound, LastName, FirstName) {
                //this.driver.sleep(500);
                var data = applicationArea[UserFound];
                var locator = byXpath(data);
				//waitForEnable(this.driver, locator);
				return commonUtils._findAndCompareText(this.driver, locator, LastName + ' ' + FirstName);
            })
            .then("Results counter $ResultsCounter = 1", function (ResultsCounter) {
				var data = applicationArea[ResultsCounter];
				var locator = byCss(data);
				var text = 'Results: 1 users';
				return commonUtils._findAndCompareText(this.driver, locator, text);
            })
			
            .given("I input email $Email in $FilterBox", function (Email, FilterBox) {
                //this.driver.sleep(1000);
                var data = applicationArea[FilterBox];
				var locator = byCss(data);
                //this.driver.sleep(500);
				var driver = this.driver;
				var value = Email;
				/*waitForEnableAndClearValue(driver, locator);
				return waitForEnableAndInputValue(driver, locator, value);*/
				return commonUtils._findAndInput(driver, locator, value).then(function() {
					return driver.sleep(200);
				});				
            })
            .then("We should see user where $EmailFound = $Email", function (EmailFound, Email) {
                //this.driver.sleep(1000);
                var data = applicationArea[EmailFound];
				var locator = byXpath(data);
				return waitLocator(this.driver, locator)
				.then( function (found) {
					found
                        .getText()
                        .then(function (text)
                        {
                            assert.equal(text, Email);
                        });
				});
            })
            .then("Results number $ResultsCounter = 1", function (ResultsCounter) {
                //this.driver.sleep(1000);
                var data = applicationArea[ResultsCounter];
                var locator = byCss(data);
				var driver = this.driver;
				var text = 'Results: 1 users';
				return waitForEnableAndCompareText(driver, locator, text);
            })
            .given("Clear filter $FilterBox", function (FilterBox) {
                var driver = this.driver;
                var data = applicationArea[FilterBox];
                var locator = byCss(data);
				/*return commonUtils._findElements(driver, locator).then(function(elements) {
					return elements[0].clear();
				});*/
				return commonUtils.waitForEnableAndClearValue(driver, locator);
            })

            .when("I click category $item", function (item) {
				//this.driver.sleep(1000);
                var driver = this.driver;
                var data = applicationArea[item];
                //this.driver.findElement(webdriver.By.css(this.mappingData.admin[item])).click();
                var locator = byCss(data);
 				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
            })
            .then("We should see $UserList where all items = $category", function (UserList, category) {
                var i = 1, role = 'Admin', locator;//, currUser;
                while (role !== '') {
                    if (category === "Admin") {
						locator = webdriver.By.css(this.mappingData.admin[UserList] + " > div:nth-child(" + i + ") > div.user-list-role-block > span");
                    }
                    else {
						locator = webdriver.By.css(this.mappingData.admin[UserList] + " > div:nth-child(" + i + ") > div.user-list-edit-role-block > span");
                    }
                    role = '';
                    /* jshint ignore:start */
					var driver = this.driver;
					var text = category;
					//driver.sleep(500);
					//waitForEnableAndCompareValue(driver, locator, text);
					commonUtils._findAndCompareHtml(driver, locator, text);
                    /* jshint ignore:end */
                    i++;
                }
            })

            .when("user clicks on selector $SortSelector", function (SortSelector) {
                var data = applicationArea[SortSelector];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
            })
            .then("sort selector menu SortSelector is open and $item is in it", function (item) {
                var data = applicationArea[item];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnable(driver, locator);			
            })
            .when("user clicks on $item item", function (item) {
                var data = applicationArea[item];
				var driver = this.driver;
				var locator = byCss(data);
				//return commonUtils._findAndClick(driver, locator);//waitForEnableAndClick(driver, locator);
				return waitLocator(driver, locator).then(function(element) {
					   var seq = new webdriver.ActionSequence(driver);
					   return seq.mouseMove(element).click().perform();
				});				
            })
            .then("we should see item list where items sorted ascend by $column", function (column) {
                var data = applicationArea[column];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnable(driver, locator);				
            })

            /*.when("user sees button $More", function (More) {
				//this.driver.sleep(1000);
                var data = applicationArea[More];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnable(driver, locator);				
            })*/
            .when("user sees list $BookList", function (BookList) {
                var data = applicationArea[BookList];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnable(driver, locator);				
            })
            .then("items number in $BookList = $number", function (BookList, number) {
                var data, i = 1;
				var driver = this.driver;
                //console.log(++number);
                ++number;
                while (i <= number) {
                    //for (var i = 1; i++; i <= number) {
                    data =  applicationArea[BookList] + " > div > div:nth-child(" + i + ")";
					var locator = byCss(data);
					waitForEnable(driver, locator);					
                    i++;
                }
            })
            .when("user clicks on $More button", function (More) {
                //this.driver.sleep(1000);
                var data = applicationArea[More];
				var driver = this.driver;
				var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("user sees items in $BookList", function (BookList) {
                var data = applicationArea[BookList];
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnable(driver, locator);				
            })
            .then("items in $BookList = $number", function (BookList, number) {
                var data, i = 1;
				var driver = this.driver;
                //console.log(++number);
                ++number;
                while (i <= number) {
                    //for (var i = 1; i++; i <= number + 1) {
                    data = applicationArea[BookList] + " > div > div:nth-child(" + i + ")";
					var locator = byCss(data);
					waitForEnable(driver, locator);					
                    i++;
                }
            });

    return library;

})();
