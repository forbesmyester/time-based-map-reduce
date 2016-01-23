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

            // b0: 0 0 0 0 0 = 0
            // b1: 5 6 7 8 9 = 13
            // b2: 10 12 14 16 18 = 7
            // b3: 15 18 21 24 27 = 3

            if (bucket == 'a') {
                if (key == 0) {
                    return ['b', [0, 1, 2]];
                }
                if (key == 1) {
                    return ['b', [1, 2, 3]];
                }
            }
            if ((bucket == 'b') && (key == 0)) {
                return ['c', [0, 1, 2, 3, 4]];
            }
            if ((bucket == 'b') && (key == 1)) {
                return ['c', [5, 6, 7, 8, 9]];
            }

            if ((bucket == 'b') && (key == 2)) {
                return ['c', [10, 11, 12, 13, 14]];
            }

            if ((bucket == 'b') && (key == 3)) {
                return ['c', [15, 16, 17, 18, 19]];
            }

            return [];

        }

        function lastPossibleMilliInBucket([bucket, key]) {
            if ((bucket == 'b') && (key == 3)) {
                return date.getTime() + 1;
            }
            if ((bucket == 'a') && (key == 1)) {
                return date.getTime() + 1;
            }
            if (bucket == 'c') {
                if (key <= 16) {
                    return date.getTime() - 1;
                }
                return date.getTime() + 1;
            }
            return date.getTime() - 1;
        }

        function firstPossibleMilliInBucket([bucket, key]) {
            if (bucket == 'b') {
                return date.getTime() - 1;
            }
            return lastPossibleMilliInBucket([bucket, key]);
        }

        /**
         * Standard reducer function implementation, acc is always `null` at
         * first.
         */
        function reducer(acc, item) {
            expect(item).to.not.equal(null);
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
        let tbmr = new TimeBasedMapReduce({storage, getDate, firstPossibleMilliInBucket, lastPossibleMilliInBucket, getKeysWithin, reducer});

        return Promise.all([
            tbmr.set(['c', 5], 4),
            tbmr.set(['c', 7], 3),
            tbmr.set(['c', 8], 4),
            tbmr.set(['c', 9], 2),
            tbmr.set(['c', 10], 1),
            tbmr.set(['c', 11], 2),
            tbmr.set(['c', 12], 1),
            tbmr.set(['c', 13], 3),
            tbmr.set(['c', 16], 3),
            tbmr.set(['c', 17], 3),
            tbmr.set(['c', 18], 3)
        ]).then(() => {
            return tbmr.get(['c', 9]);
        }).then((c9) => {
            expect(c9).to.eql(2);
        }).then(() => {
            return Promise.all([tbmr.get(['a', 0]), tbmr.get(['a', 1])]);
        }).then(([a0, a1]) => {
            expect([a0, a1]).to.eql([20, 23]);
        }).then(() => {
            // check that we stored the intermediate result
            return storage.get(['b', 1]);
        }).then((b1) => {
            expect(b1).to.eql([true, 13]);
        }).then(() => {
            // check we can get intermediate results.
            return Promise.all([
                tbmr.get(['b', 0]),
                tbmr.get(['b', 1]),
                tbmr.get(['b', 2]),
                tbmr.get(['b', 3])
            ]);
        }).then(([b0, b1, b2, b3]) => {
            expect([b0, b1, b2, b3]).to.eql([null, 13, 7, 3]);
        }).then(() => {
            // check intermediate results from not expired sub buckets
            // are not stored
            return Promise.all([
                storage.get(['a', 0]),
                storage.get(['a', 1]),
                storage.get(['b', 2]),
                storage.get(['b', 3])
            ]);
        }).then(([a0, a1, b2, b3]) => {
            expect([a0, a1, b2, b3]).to.eql([[true, 20], [false, null], [true, 7], [false, null]]);
        }).then(done, done);

    });

});
