/**
 * UnifiedSettingsService is unified service for working with settings and parameters.
 * This service encapsulated in self works with storage, encode Entity using
 * EntityFactory.
 * 
 * For starting works with UnifiedSettingsService you need configure this service.
 * Options for configure:
 * 
 *    $localStorage(boolean, default: false)
 *       set true if need store this group into localStorage
 * 
 *    $saveOnSet(boolean, default: false)
 *       set true if you need auto-save for this setting group
 * 
 *    $defaultValue(any, default: null)
 *       what default value of this setting
 * 
 *    $entityType(any, default: null)
 *       in what Entity needs to wrap value of this setting
 * 
 *    $writable(boolean, default: true)
 *       set false for read-only mode on
 * 
 *    $groupMapper(function, default: return groupName)
 *       function for detect localStorage key.
 *       signature function(groupName)
 * 
 *    $customProcessor(function, default: non process)
 *       function for prepare value of setting. Calling after Entity wrap.
 * 
 *    $version(number, default: 0)
 *       version of settings internal LocalStorage format
 * 
 *    $versionConverter(function, default: return current setting)
 *       function for converting old setting format to new format. Default: unformatted setting
 * 
 *    definitions(object)
 *       Some definitions configure for settings. It may be hierarchical structure for it.
 *       For example:
 * 
 *          someGroup: {
 *             $localStorage  : true/false
 *             $saveOnSet     : true/false
 *             $groupMapper   : function groupMapper(groupName) return storageKey
 * 
 *             someName: {
 *                $defaultValue     : 'def_val'
 *                $entityType       : 'Entity|Patient|Profile'
 *                $customProcessor  : function(value){ return value.toFixed(2); }
 *                $version          : 2
 *                $versionConverter : function(setting) { setting.attr = 2; return setting }
 *             }
 *          }
 *
 * You can get some setting use:
 *    - getter function:
 *       var settingValue = swSettingsService.getSetting(groupName, settingName);
 *    - or use direct access in some group
 *       var group = swSettingsService.getGroup(groupName);
 *       var settingValue = group[settingName];
 * 
 * For change some setting you use:
 *    - setter function:
 *       swSettingsService.getSetting(groupName, settingName, value);
 *    - or change value in group and then save it:
 *       var group = swSettingsService.getGroup(groupName);
 *       group[settingName] = newSettingValue;
 *       group.save();
 *
 * You can update group settings use:
 *    - for single group:
 *       swSettingsService.updateGroup('SOME_GROUP_NAME', {prop1: 2, prop2: 'foo'});
 *    - for multiply groups:
 *       swSettingsService.updateGroups({
 *          'SOME_GROUP_NAME': {prop1: 2, prop2: 'foo'},
 *          'ANOTHER_GP_NAME': {attr1: 8, attr2: 'bar'}
 *       });
 * 
 * Default keys for localStorage defined as name of group,
 * but You can configure keys for localStorage depending on your needs. You can add some constant 
 * or use only constant key for all groups.
 *
 * Also you can listening changes in some settings with func addOnSettingsChangeListener/removeOnSettingsChangeListener.
 * 
 * If you need save setting into server you can add onChange listener for you settings.
 * And save setting in you configure block.
 */
define([
   'module',
   'swServiceFactory',
   'underscore'
], function (module, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         'swLocalStorageService',
         'swEntityFactory',

         function (
            swLocalStorageService,
            swEntityFactory
         ){
            /* --- api --- */
            this.getGroup     = getGroup;
            this.updateGroups = updateGroups;
            this.updateGroup  = updateGroup;
            this.getSetting   = getSetting;
            this.setSetting   = setSetting;

            this.addOnSettingsChangeListener    = addListener;
            this.removeOnSettingsChangeListener = removeListener;


            /* === impl === */

            this._configure = _configure;

            var logger        = this.logger,
                _listenersMap = {},
                _cache        = {},
                _definitions  = {};

            var DEFAULT_DEFINITION = {
               $localStorage     : false,
               $saveOnSet        : false,
               $defaultValue     : null,
               $entityType       : null,
               $writable         : true,
               $version          : 0,
               $groupMapper      : _.identity,
               $customProcessor  : _.identity,
               $versionConverter : _.identity
            };

            function _configure(options)
            {
               var definitions = _prepareDefinitions(options);
               // maybe need deep extend
               _.extend(_definitions, definitions);
            }

            function _prepareDefinitions(options)
            {
               var definitions = options.definitions || {};

               _.each(definitions, function(definition)
               {
                  var keys = _.intersection(_.keys(DEFAULT_DEFINITION), _.keys(options));
                  _.each(keys, function(key)
                  {
                     if ( _isEmpty(definition[key]) )
                     {
                        // $localStorage, $saveOnSet, $groupMapper, etc
                        definition[key] = options[key];
                     }
                  });
               });
               return definitions;
            }

            function _isEmpty(val)
            {
               return (_.isUndefined(val) || _.isNull(val));
            }

            /**
             * Get settings group by name
             *
             * @param  {String}  groupName   - name of settings group
             * @return {SettingGroup} settings group structure
             */
            function getGroup(groupName)
            {
               // concat groupName because we need unique cache-key for single group
               var storageKey = _detectKeyForGroup(groupName) + '_' + groupName;
               _cache[storageKey] = _cache[storageKey] || new SettingGroup(groupName);
               return _cache[storageKey];
            }

            /**
             * Refresh setting for single group
             * @param  {String} groupName - name of group
             * @param  {Object} data      - data for update info
             */
            function updateGroup(groupName, data)
            {
               var group = getGroup(groupName);
               group.update(data);
            }

            /**
             * Refresh settings info (from localStorage, server response or another)
             * @param  {object}  groups - settings data. where key is groupName, value is group data
             */
            function updateGroups(groups) {
               _.each(groups, function(data, groupName)
               {
                  updateGroup(groupName, data);
               });
            }

            /**
             * get setting for name
             * 
             * @param  {string}  groupName   - name of setting group
             * @param  {string}  settingName - name of some setting
             * @return {any} setting value
             */
            function getSetting(groupName, settingName) {
               return getGroup(groupName).get(settingName);
            }

            /**
             * change setting value
             * 
             * @param  {string}  groupName   - name of setting group
             * @param  {string}  settingName - name of some setting
             * @param  {string}  value       - setting value
             */
            function setSetting(groupName, settingName, value)
            {
               getGroup(groupName).set(settingName, value);
            }

            function _detectKeyForGroup(groupName)
            {
               var _groupMapper = _definition4prop('$groupMapper', groupName);
               return _groupMapper(groupName);
            }

            function _getSettingsFromLocalStorage(groupName, withoutFiltering)
            {
               var storageKey = _detectKeyForGroup(groupName);
               var settings = swLocalStorageService.get(storageKey);

               if ( _isEmpty(settings) )
               {
                  settings = [];
               }
               else if ( !_.isArray(settings) )
               {
                  logger.warn('Unexpected internal LocalStorage item format. Removed.', storageKey, settings);
                  settings = [];
                  swLocalStorageService.remove(storageKey);
               }

               // if we need all settings from localStorage
               // for example: we need update value in localStorage
               if ( !withoutFiltering )
               {
                  var cond = {
                     group : groupName
                  };

                  settings = _.filter(settings, cond);
               }

               return settings;
            }

            function _refreshSetting(settings, groupName, settingName, value)
            {
               var cond = {
                  group : groupName,
                  name  : settingName
               };

               var setting  = _.findWhere(settings, cond);
               if ( setting )
               {
                  setting.value = value;
                  setting.setAt  = _.now();
               }
               else
               {
                  setting = new Setting(groupName, settingName, value);
                  settings.push(setting);
               }

               setting.version = _definition4prop('$version', groupName, settingName);
            }

            function _storeSettings(groupName, data)
            {
               if ( !_definition4prop('$localStorage', groupName) )
               {
                  return;
               }

               var settings = _getSettingsFromLocalStorage(groupName, true);

               _.each(data, function(value, settingName)
               {
                  if ( settingName[0] !== '$' )
                  {
                     _refreshSetting(settings, groupName, settingName, value);
                  }
               });

               var storageKey = _detectKeyForGroup(groupName);
               swLocalStorageService.set(storageKey, settings);
            }

            function _findListeners(groupName, settingName)
            {
               var key = [groupName, settingName].join('_');
               _listenersMap[key] = (_listenersMap[key] || []);
               return _listenersMap[key];
            }

            function _onChangeSetting(groupName, settingName, value)
            {
               var setting = new Setting(groupName, settingName, value);
               var listeners = _findListeners(groupName, settingName);
               listeners.forEach(function(listener)
               {
                  listener(setting);
               });
            }

            function addListener(groupName, settingName, _listener)
            {
               var listeners = _findListeners(groupName, settingName);
               listeners.push(_listener);
            }

            function removeListener(groupName, settingName, _listener)
            {
               var listeners = _findListeners(groupName, settingName);
               _.remove(listeners, function(listener) {
                  return listener === _listener;
               });
            }

            function Setting(groupName, settingName, value)
            {
               this.group  = groupName;
               this.name   = settingName;
               this.value  = value;
               this.setAt  = _.now();
               this.version   = _definition4prop('$version', groupName, settingName);
            }

            function _wrapToEntity(groupName, settingName, value)
            {
               var type = _definition4prop('$entityType', groupName, settingName);
               if ( !type )
               {
                  return value;
               }

               var _wrapper = _.partial(swEntityFactory.create, type);

               if ( _.isArray(value) )
               {
                  return _.map(value, _wrapper);
               }
               return _wrapper(value);
            }

            function _customProcessor(groupName, settingName, value)
            {
               var processor = _definition4prop('$customProcessor', groupName, settingName);
               return processor(value);
            }

            function _definition4prop(definitionKey, groupName, settingName)
            {
               var groupDefinition = _definitions[groupName] || {};

               var result;
               if ( !_isEmpty(settingName) ) {
                  var settingDefinition = groupDefinition[settingName] || {};
                  result = settingDefinition[definitionKey];
               }

               if ( _isEmpty(result) )
               {
                  result = groupDefinition[definitionKey];
               }
               if ( _isEmpty(result) )
               {
                  result = DEFAULT_DEFINITION[definitionKey];
               }
               return result;
            }

            function _readGroupFromLocalStorage(groupName)
            {
               var settings = _getSettingsFromLocalStorage(groupName);

               return _.reduce(settings, _reducer, {});

               function _reducer(memo, setting) {
                  var settingName = setting.name;
                  var needVersion = _definition4prop('$version', groupName, settingName);

                  if ( needVersion > setting.version ) {
                     var converter = _definition4prop('$versionConverter', groupName, settingName);
                     setting = converter(setting, needVersion);
                  }

                  memo[settingName] = setting.value;
                  return memo;
               }
            }

            function _setProp4group(settingGroup, groupName, data)
            {
               var props = {
                  '$groupName' : {
                     value : groupName
                  }
               };

               props = _.reduce(data, _propertiesReducer, props);

               Object.defineProperties(settingGroup, props);

               function _propertiesReducer(memo, value, settingName)
               {
                  var writable = _definition4prop('$writable', groupName, settingName);
                  if ( settingName[0] === '$' || (_.has(settingGroup, settingName) && !writable) )
                  {
                     return memo;
                  }

                  if ( _isEmpty(value) )
                  {
                     value = _definition4prop('$defaultValue', groupName, settingName);
                  }

                  value = _wrapToEntity(groupName, settingName, value);

                  value = _customProcessor(groupName, settingName, value);

                  memo[settingName] = {
                     value       : value,
                     enumerable  : true,
                     writable    : writable
                  };
                  return memo;
               }
            }

            /**
             * @param  {string}  groupName   - name of setting group
             * @param  {object}  data        - data of the settings group
             * @constructor
             */
            function SettingGroup(groupName, data)
            {
               data = data || {};

               // prepare all defined default properties
               var defaultData = _.object(_.keys(_definitions[groupName]));

               var storageData = _readGroupFromLocalStorage(groupName);

               data = _.extend(defaultData, storageData, data);

               _setProp4group(this, groupName, data);
            }

            SettingGroup.prototype.set = function(settingName, value)
            {
               var groupName = this.$groupName;
               this[settingName] = value;

               if ( _definition4prop('$saveOnSet', groupName, settingName) )
               {
                  var data = {};
                  data[settingName] = value;
                  _storeSettings(groupName, data);
               }

               _onChangeSetting(groupName, settingName, value);
            };

            SettingGroup.prototype.get = function(settingName)
            {
               return this[settingName];
            };

            SettingGroup.prototype.save = function()
            {
               _storeSettings(this.$groupName, this);
            };

            SettingGroup.prototype.update = function(data)
            {
               var groupName = this.$groupName;
               _setProp4group(this, groupName, data);

               this.save();
               _.each(data, function(value, settingName)
               {
                  _onChangeSetting(groupName, settingName, value);
               });
            };
         }
      ]
   });
});
