"use strict"
let mocha = require('mocha');
let assert = require('chai').assert;
let parser = require('./sc2kparser.js');

let compressedSegment = Uint8Array.from([2, 34, 55, 130, 255]);
let decompressed = parser.decompressSegment(compressedSegment);
let expected = [34, 55, 255, 255, 255];
assert(decompressed.toString() === expected.toString(), decompressed, expected);

//         title        length   data
let arr = [65,66,67,68, 0,0,0,4, 3,1,2,3];
let fileBytes = Uint8Array.from(arr);
let segments = parser.splitIntoSegments(fileBytes);
let expected = {
  "ABCD": Uint8Array.from([1, 2, 3])
};
assert(JSON.stringify(segments) === JSON.stringify(expected), JSON.stringify(segments), JSON.stringify(expected));

let struct = {tiles:[{}, {}, {}]};
let handler = parser.segmentHandlers.ALTM;
let segment = Uint8Array.from([0x00, 0x81, 0x00, 0x08]);
handler(segment, struct);
assert(struct.tiles[0].alt === 50, 'altm 1a');
assert(struct.tiles[0].water, 'altm 1b');
assert(struct.tiles[1].alt === 400, 'altm 2a');
assert(!struct.tiles[1].water, 'altm 2b');

struct = {tiles:[{}, {}, {}]};
handler = parser.segmentHandlers.CNAM;
segment = Uint8Array.from([5, 104, 101, 108, 108, 111]);
handler(segment, struct);
assert(struct.cityName === 'hello', 'cnam', struct.cityName);
