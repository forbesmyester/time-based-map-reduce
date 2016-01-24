import R from 'ramda';

import Constants from './Constants.js';

const STORED = Constants.STORAGE.STORED;
const ALREADY_KNOWN = Constants.STORAGE.ALREADY_KNOWN;

export default function(/* here you pass in instances to db connections etc */) {

    let data = {};

    function get([bucket, key]) {
        return new Promise((resolve) => {
            let d = R.path([bucket, key], data);
            if (d === undefined) {
                return resolve([ false, null ]);
            }
            resolve([true, d]);
        });
    }

    function set([bucket, key], value) {
        return get([bucket, key])
            .then(([found]) => {
                if (!found) {
                    data = R.assocPath([bucket, key], value, data);
                    return STORED;
                }
                return ALREADY_KNOWN;
            });
    }

    function _all() { return data; }

    return { get, set, _all };
}
