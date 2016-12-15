define([
    '../dao/DB'
], function(DB) {
    "use strict";

    var id = '_local/settings';

    return {
        GET:{
            '': getSettings
        },
        POST:{
            '': saveSettings
        }
    };



    /**
     *
     */
    function saveSettings(settings) {
        return DB.userRW()
            .get(id)
            .catch(function() {
                return {
                    _id: id,
                    type: 'meta'
                };
            })
            .then(function(doc) {
                var group = doc[settings.group] || {};
                group[settings.name] = {
                    value: settings.value,
                    setAt: settings.setAt,
                    version: settings.version
                };

                doc[settings.group] = group;

                return DB.userRW().put(doc)
                    .catch(function() {
                        return saveSettings(settings);
                    });
            });
    }

    /**
     *
     */
    function getSettings() {
        return DB.userRW()
            .get(id)
            .catch(function() {
                return {
                };
            })
            .then(function(doc) {
                var result = [];
                for (var group in doc) {
                    if (doc.hasOwnProperty(group) && doc[group] instanceof Object) {
                        var settings  = doc[group];
                        for (var name in settings) {
                            if (settings.hasOwnProperty(name)) {
                                result.push({
                                    group: group,
                                    name: name,
                                    value: settings[name].value,
                                    setAt: settings[name].setAt,
                                    version: settings[name].version
                                });
                            }
                        }
                    }
                }
                return result;
            });
    }

});
