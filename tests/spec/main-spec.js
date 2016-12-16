/* jshint ignore:start */
require('jasmine-before-all');
var Yadda = require('yadda');
var fs = require('fs');
var webdriver = require('selenium-webdriver');

//Yadda.plugins.mocha.ScenarioLevelPlugin.init();
Yadda.plugins.mocha.StepLevelPlugin.init();
//Yadda.plugins.mocha.StepLevelPlugin.init();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
jasmine.DEFAULT_UPDATE_INTERVAL = 120000;

var driver;

//parse mapping json file with model data and css selectors
var mappingData = JSON.parse(fs.readFileSync("data/mappingData.json"));
var environmentConfigData = JSON.parse(fs.readFileSync("data/environmentConfig.json"));

var applications = ['portal', 'editor', 'reader', 'admin'];   //   ,,    ,   ,,,,  ,,,


function takeScreenshot(step) {
    'use strict';
    var path = 'screenshots/' + step.replace(/\W+/g, '_').toLowerCase() + '.png';
    return driver.takeScreenshot().then(function (data) {
        fs.writeFileSync(path, data, 'base64');
    });
}

function executeInFlow(application, step, done) {
    'use strict';

    return webdriver.promise.controlFlow().execute(_inflow).then(done).thenCatch(_onerror).thenFinally(function() {
		return takeScreenshot(step);
	});
	
	function _inflow() {
		new Yadda.Yadda(require('../library/' + application + '-library'), {
			driver: driver,
			mappingData: mappingData,
			environmentConfigData: environmentConfigData
		}).yadda(step);
		console.log(application, '=> step: ', step);
	}
	
	function _onerror(err) {
		console.log('_onerror', err);
		return takeScreenshot(step).then(done);
		/*
		.then(function() {
			return webdriver.promise.rejected(err.message || '_onError');
		});
		**/
	}
}

function runScenarios(application) {
    'use strict';
    new Yadda.FeatureFileSearch('features/' + application).each(function (file) {
        featureFile(file, function (feature) {
            scenarios(feature.scenarios, function (scenario) {
				//console.log(scenario.title);
                steps(scenario.steps, _curry(executeInFlow, application));
            });
        });
    });
}


function _curry(fn) {
   var args = getRest(toArray(arguments));

	return function () {
		return fn.apply(this, args.concat(toArray(arguments)));
	};
}

function getRest(arrOrString){
	return toArray(arrOrString).slice(1);
}

function toArray(arr){
    return (
    (Array.isArray(arr) && arr)
    || (!Array.isArray(arr) && arr.length && [].slice.call(arr))
    || (typeof arr === 'string' && arr.split(''))
    || (typeof arr === 'object' && [])
    )
}

describe('Reader', function () {
    'use strict';
    beforeAll(function () {
		var path = 'screenshots';
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
        driver = new webdriver.Builder()
                .withCapabilities(webdriver.Capabilities.chrome())
                .build();
    });

	applications.forEach(runScenarios);

    afterAll(function (done) {
        driver.quit().then(done, done);
    });

})

        ;
/* jshint ignore:end */