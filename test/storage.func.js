import {expect} from "chai";

import Constants from '../src/Constants.js';

const STORED = Constants.STORAGE.STORED;
const ALREADY_KNOWN = Constants.STORAGE.ALREADY_KNOWN;

export default function(sm, done) {

    sm.get(['i', 'not exist'])
        .then((result) => {
            expect(result).to.eql([false, null]);
        })
    .then(() => {
        return sm.set(['i', 'exist'], 1);
    })
    .then((result) => {
        expect(result).to.eql(STORED);
    })
    .then(() => {
        return sm.get(['i', 'exist']);
    })
    .then((result) => {
        expect(result).to.eql([true, 1]);
    })
    .then(() => {
        return sm.set(['i', 'exist'], 1);
    })
    .then((result) => {
        expect(result).to.eql(ALREADY_KNOWN);
    })
    .then(done, done);
}
