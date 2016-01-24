import R from 'ramda';

export default class TimeBasedMapReduce {
    constructor({storage, getDate, firstPossibleMilliInBucket, lastPossibleMilliInBucket, getKeysWithin, reducer}) {
        this._storage = storage;
        this._firstPossibleMilliInBucket = ([bucket, key]) => {
            let r = firstPossibleMilliInBucket([bucket, key]);
            if (r instanceof Date) {
                r = r.getTime();
            }
            return r;
        };
        this._usingFirstPossibleMilliInBucketOptimization =
            !!firstPossibleMilliInBucket;
        this._lastPossibleMilliInBucket = ([bucket, key]) => {
            let r = lastPossibleMilliInBucket([bucket, key]);
            if (r instanceof Date) {
                r = r.getTime();
            }
            return r;
        };
        this._getDate = getDate;
        this._getKeysWithin = getKeysWithin;
        this._reducer = reducer;
    }

    _keyFilter(nowT, [bucket, keys]) {
        if (!this._usingFirstPossibleMilliInBucketOptimization) {
            return keys;
        }
        return R.filter(
            (key) => {
                if (nowT > this._firstPossibleMilliInBucket([bucket, key])) {
                    return true;
                }
                return false;
            },
            keys
        );
    }

    set([bucket, key], value) {
        return this._storage.set([bucket, key], value);
    }

    get([bucket, key]) {
        return this._storage.get([bucket, key])
            .then(([found, v]) => {
                if (found) {
                    return v;
                }
                return this._getLower([bucket, key]);
            });
    }

    _getLower([bucket, key]) {

        let keysWithin = this._getKeysWithin([bucket, key]),
            nowT = this._getDate().getTime(),
            bkT = this._lastPossibleMilliInBucket([bucket, key]);

        if (keysWithin.length === 0) {
            return this._storage.get([bucket, key])
                .then(([, v]) => { return v; });
        }

        return Promise.all(R.map(
                (k) => { return this.get([keysWithin[0], k]); },
                this._keyFilter(nowT, keysWithin)
            ))
            .then((values) => {

                let result = R.reduce(
                    this._reducer,
                    null,
                    R.filter((v) => { return (v !== null); }, values)
                );
                if (bkT > nowT) {
                    return result;
                }
                return this._storage.set([bucket, key], result)
                    .then(() => {
                        return result;
                    });
            });

    }


}
