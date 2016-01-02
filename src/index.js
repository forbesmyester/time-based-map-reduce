import R from 'ramda';

export default class TimeBasedMapReduce {
    constructor({storage, getDate, convertBucketKeyToDate, getKeysWithin, reducer}) {
        this._storage = storage;
        this._convertBucketKeyToDate = convertBucketKeyToDate;
        this._getDate = getDate;
        this._getKeysWithin = getKeysWithin;
        this._reducer = reducer;
    }

    set([bucket, key], value) {
        return this._storage.set([bucket, key], value);
    }

    get([bucket, key]) {
        let nowT = this._getDate().getTime(),
            bkT = this._convertBucketKeyToDate([bucket, key]);
        if (bkT instanceof Date) {
            bkT = bkT.getTime();
        }

        if (bkT > nowT) {
            return undefined;
        }


        let keysWithin = this._getKeysWithin([bucket, key]);
        if (keysWithin.length === 0) {
            return this._storage.get([bucket, key])
                .then((v) => {
                    return v;
                });
        }

        return Promise.all(R.map(
                (k) => { return this.get([keysWithin[0], k]); },
                keysWithin[1]
            ))
            .then((values) => {
                if (R.indexOf(undefined, values) !== -1) {
                    return undefined;
                }
                let result = R.reduce(
                    this._reducer,
                    null,
                    values
                );
                return this._storage.set([bucket, key], result)
                    .then(() => {
                        return result;
                    });
            });

    }


}
