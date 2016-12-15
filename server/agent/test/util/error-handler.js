const assert = require('assert');
const handler = require('../../lib/util/error-handler');

describe('Error handler [UNIT]', function () {

    it('Should return bad request code & message', function () {
        const errMsg = 'error';
        handler.bad('error')
            .catch(e=>{
                assert.equal(e.message, errMsg);
                assert.equal(e.status, 400);
            });
    });

    it('Should throw error, if statusCode != 404', function () {
        const err = {
            statusCode: 409,
            message: 'conflict'
        };
        handler.notFound('')(err)
            .catch(e=>{
                assert.equal(e.message, err.message);
                assert.equal(e.status, err.statusCode);
            });
    });

    it('Should return bad request for 404', function () {
        const err = {
            statusCode: 404
        };
        const docId = '123';
        handler.notFound(docId)(err)
            .catch(e=>{
                assert.equal(e.message, 'Cannot find document ' + docId);
                assert.equal(e.status, err.statusCode);
            });
    });

    it('Should return empty doc for 404', function () {
        const err = {
            statusCode: 404
        };
        const result = handler.notFoundOk(err);
        assert.deepEqual(result, {});
    });

    it('Should return bad request code & message', function () {
        const err = {
            statusCode: 409,
            message: 'conflict'
        };
        Promise.resolve(handler.notFoundOk(err))
            .catch(e=>{
                assert.equal(e.message, err.message);
                assert.equal(e.status, 400);
            });
    });
});