const assert = require('assert');
const idGenerator = require('../../lib/util/id-generator');

describe('ID generator [UNIT]', function () {

    it('Should return user prefix', function () {
        assert.equal(idGenerator.user('test'), 'user-test');
    });

    it('Should return book prefix', function () {
        assert.equal(idGenerator.book('test'), 'pub-test');
    });

    it('Should return course prefix', function () {
        assert.equal(idGenerator.course('test'), 'course-test');
    });

    it('Should return book-course prefix', function () {
        assert.equal(idGenerator.bookCourse('1', '2'), 'pub-1-course-2');
    });
});