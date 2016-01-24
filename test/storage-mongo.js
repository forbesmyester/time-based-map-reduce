import getSm from '../src/storage-mongo.js';
import f from './storage.func';


describe('Mongo Storage', function() {

    it('can store and retrieve', function(done) {
        let sm = getSm(
            require('monk')('127.0.0.1/time-based-map-reduce'),
            { collection: 'time-based-map-reduce-' + (new Date().getTime())}
        );
        f(sm, done);
    });

});

