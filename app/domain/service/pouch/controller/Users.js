define([
    '../dao/User',
    '../dao/UserStudy',
    '../tools'
    //TODO 403, write smth like configReader.js
    //'text!config/default.srv.config.json'
], function(User, UserStudy, tools) {
    "use strict";

    //config.emailConfirmationStatus.notConfirmed
    var notConfirmed = 'NotConfirmed';

    return {
        GET:{
            'profile' : profile
        },
        POST:{
            update: updateInfo
        }
    };

    function updateInfo(data) {
        return User.getCurrentUser()
            .then(function(user) {
                var fields = ['firstName', 'lastName', 'email', 'photo'];
                fields.forEach(function(f) {
                    user[f] = data[f] || user[f];
                });

                return User.setInfo(data);
            });
    }

    /**
     * user materials
     */
    function profile(req) {
        return tools.Promise.all([
                User.getCurrentUser(),
                User.getById(req.id),
                UserStudy.getStats()
            ])
            .then(function(res) {
                var curUser = res[0];
                var user = res[1];
                var stats = res[2];

                if (req.id === curUser.id) {
                    user.firstName = curUser.firstName;
                    user.lastName = curUser.lastName;
                    user.email = curUser.email;
                    user.photo = curUser.photo;
                }

                var profileInfo = {
                    id: user.userId,
                    email: user.email && user.email[0],
                    lastName: user.lastName,
                    firstName: user.firstName,
                    editorRole: user.roles && user.roles.indexOf('editor') > -1 || false,
                    adminRole: user.roles && user.roles.indexOf('admin') > -1 || false,
                    active: (user.status && user.status === 'active') || true,
                    photo: user.photo ? user.photo.fileHash : ''
                };

                return {
                    userProfileInfo: profileInfo,
                    userProfileStatus: {
                        hasExternalProfile : user.external && user.external.length !== 0,
                        hasPassword : curUser.hasPassword,
                        hasNotConfirmedEmail : curUser.emailConfirmationStatus === notConfirmed
                    },
                    userStudyStatistics: stats
                };
            });
    }

});
