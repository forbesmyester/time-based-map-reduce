import R from 'ramda';
import assert from 'assert';

import Constants from './Constants.js';

const STORED = Constants.STORAGE.STORED;
const ALREADY_KNOWN = Constants.STORAGE.ALREADY_KNOWN;

export default function(db, options) {

    assert((options || {}).hasOwnProperty('collection'));
    let opts = R.merge({}, options);

    function get([bucket, key]) {
        return db.get(opts.collection).findOne({_id: { b: bucket, k: key }})
            .then((result) => {
                if (result === null) {
                    return [false, null];
                }
                return [true, result.v];
            });
    }

    function set([bucket, key], value) {
        return db.get(opts.collection).insert(
            { _id: { b: bucket, k: key }, v: value }
        ).then(
            () => { return STORED; },
            (err) => {
                if (err.message.match(/^E11000 duplicate key/)) {
                    return ALREADY_KNOWN;
                }
                throw err;
            }
        );
    }

    return { get, set };
}
