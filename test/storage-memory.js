import getSm from '../src/storage-memory.js';
import f from './storage.func';

describe('Memory Storage', function() {

    it('can store and retrieve', function(done) {
        let sm = getSm();
        f(sm, done);
    });

});
