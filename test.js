"use strict"
var parser = require('./sc2kparser.js');

var assert = function(bool) {
  if(!bool) {
    console.error(arguments);
  } else {
    console.log('test passed');
  }
}

var compressedSegment = Uint8Array.from([2, 34, 55, 130, 255]);
var decompressed = parser.decompressSegment(compressedSegment);
var expected = [34, 55, 255, 255, 255];
assert(decompressed.toString() === expected.toString(), decompressed, expected);

//         title        length   data
var arr = [65,66,67,68, 0,0,0,4, 3,1,2,3];
var fileBytes = Uint8Array.from(arr);
var segments = parser.splitIntoSegments(fileBytes);
var expected = {
  "ABCD": Uint8Array.from([1, 2, 3])
};
assert(JSON.stringify(segments) === JSON.stringify(expected), JSON.stringify(segments), JSON.stringify(expected));

var struct = {tiles:[{}, {}, {}]};
var handler = parser.segmentHandlers.ALTM;
var segment = Uint8Array.from([0x00, 0x81, 0x00, 0x08]);
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
