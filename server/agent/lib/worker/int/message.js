"use strict";
/* jshint -W106 */

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');

/**
 * Handle tasks by TaskHandler
 * @constructor
 */
function Message() {
    const self = this;

    self.send = (input, task)=>{
        var userId = names.getUserId(task.db);
        var promises = [];
        input.recipientIds.forEach(function (recipientId) {
            if (userId !== recipientId) {
                var message = {
                    _id: 'message-' + input._id,
                    registeredAt: input.registeredAt,
                    fromUserId: userId,
                    toUserId: recipientId,
                    text: input.text,
                    subject: input.subject,
                    reviewed: false,
                    msgType: input.msgType,
                    type: 'message'
                };

                if (input.extendMessageParams) {
                    for (var i in input.extendMessageParams) {
                        if (input.extendMessageParams.hasOwnProperty(i)) {
                            message[i] = input.extendMessageParams[i];
                        }
                    }
                }
                promises.push(nano.use(names.user_rw(recipientId)).insert(message));
            }
        });

        //TODO if 409 error occured, it means that the message was created already. Need to handle it
        return Promise.all(promises);
    };
}

module.exports = Message;



