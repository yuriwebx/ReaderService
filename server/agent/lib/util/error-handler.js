"use strict";
const badRequest = (message)=>{return Promise.reject({status: 400, message: message});};


module.exports = {

    bad: badRequest,
    notFound: (id)=>{
        return function(e) {
            if (e.statusCode === 404) {
                return badRequest('Cannot find document ' + id);
            }
            return Promise.reject(e);
        };
    },
    notFoundOk: (e)=> {
        if (e.statusCode === 404) {
            return {};
        }
        return badRequest(e.message);
    }
};