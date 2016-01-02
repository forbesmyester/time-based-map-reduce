import {expect} from "chai";

import getSm from '../src/storage-memory.js';
import TimeBasedMapReduce from '../src/index';

describe('time-based-map-reduce', function() {

    it('will recursively work', function(done) {

        let date = new Date();
        function getDate() {
            return date;
        }

        /**
         * Lists all buckets / keys that should be within the given bucket
         * and key.
         *
         * For example the input `['day', '2015-12-22']` may return the value
         * `['minute', ['2015-12-22T00:00', '2015-12-22T00:01', ...]`
         */
        function getKeysWithin([bucket, key]) {
            if (bucket == 'a') {
                if (key == 0) {
                    return ['b', [0, 1, 2]];
                }
                if (key == 1) {
                    return ['b', [1, 2, 3]];
                }
            }
            if (bucket == 'b') {
                if (key == 3) {
                    let t = new Date().getTime();
                    return ['c', [t - 3, t - 2, t - 1, t, t + 1, t + 2]];
                }
                return ['c', [key * 5, key * 6, key * 7, key * 8, key * 9]];
            }

            return [];

        }

        function convertBucketKeyToDate([bucket, key]) {
            if (bucket == 'c') {
                return key;
            }
            return date.getTime() - 1;
        }

        /**
         * Standard reducer function implementation, acc is always `null` at
         * first.
         */
        function reducer(acc, item) {
            if (acc === null) {
                acc = 0;
            }
            if (item === null) { // no item stored here yet
                return acc;
            }
            if (item === undefined) { // item blocked as includes future data
                return undefined;
            }
            return acc + item;
        }

        let storage = getSm();
        let tbmr = new TimeBasedMapReduce({storage, getDate, convertBucketKeyToDate, getKeysWithin, reducer});

        return Promise.all([
            tbmr.set(['c', 5], 4),
            tbmr.set(['c', 7], 3),
            tbmr.set(['c', 8], 4),
            tbmr.set(['c', 9], 2),
            tbmr.set(['c', 10], 1),
            tbmr.set(['c', 12], 2),
            tbmr.set(['c', 16], 1),
            tbmr.set(['c', 18], 3),
            tbmr.set(['c', date.getTime() - 1], 1),
            tbmr.set(['c', date.getTime() - 2], 1),
            tbmr.set(['c', date.getTime() - 3], 1)
        ]).then(() => {
            return tbmr.get(['c', 9]);
        }).then((c9) => {
            expect(c9).to.eql(2);
        }).then(() => {
            return Promise.all([tbmr.get(['a', 0]), tbmr.get(['a', 1])]);
        }).then(([a0, a1]) => {
            expect([a0, a1]).to.eql([20, undefined]);
        }).then(() => {
            // check that we stored the intermediate result
            return storage.get(['b', 1]);
        }).then((b1) => {
            expect(b1).to.eql(13);
        }).then(() => {
            // check we can get intermediate results.
            return Promise.all([
                tbmr.get(['b', 0]),
                tbmr.get(['b', 1]),
                tbmr.get(['b', 2]),
                tbmr.get(['b', 3])
            ]);
        }).then(([b0, b1, b2, b3]) => {
            expect([b0, b1, b2, b3]).to.eql([0, 13, 7, undefined]);
        }).then(done, done);

    });

});
