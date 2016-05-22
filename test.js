"use strict"
let mocha = require('mocha');
let assert = require('chai').assert;
let parser = require('./sc2kparser.js');


describe('decompressSegment', () => {
  let compressedSegment = Uint8Array.from([2, 34, 55, 130, 255]);
  let decompressed = parser.decompressSegment(compressedSegment);
  let expected = [34, 55, 255, 255, 255];
  it('should decompress correctly', () => {
    assert.equal(decompressed.toString(), expected.toString());
  });
});

//         title        length   data
describe('splitIntoSegments', () => {
  let arr = [65,66,67,68, 0,0,0,4, 3,1,2,3];
  let fileBytes = Uint8Array.from(arr);
  let segments = parser.splitIntoSegments(fileBytes);
  let expected = {
    "ABCD": Uint8Array.from([1, 2, 3])
  };
  it('should split into segments', () => {
    assert(JSON.stringify(segments) === JSON.stringify(expected));
  });
});

describe('segment handlers', () => {

  describe('altm', () => {
    it('should parse altitude data', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.ALTM;
      let segment = Uint8Array.from([0x00, 0x81, 0x00, 0x08]);
      handler(segment, struct);
      assert.equal(struct.tiles[0].alt, 50);
      assert.isTrue(struct.tiles[0].water);
      assert.equal(struct.tiles[1].alt, 400);
      assert.isNotTrue(struct.tiles[1].water);
    });
  });

  describe('cnam', () => {
    it('should parse name data', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.CNAM;
      let segment = Uint8Array.from([5, 104, 101, 108, 108, 111]);
      handler(segment, struct);
      assert.equal(struct.cityName, 'hello');
    });
  });

  describe('xbit', () => {
    it('should handle flags on', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XBIT;
      let segment = Uint8Array.from([0xFF, 0]);
      handler(segment, struct);
      assert.isTrue(struct.tiles[0].saltwater);
      assert.isTrue(struct.tiles[0].watercover);
      assert.isTrue(struct.tiles[0].watersupplied);
      assert.isTrue(struct.tiles[0].piped);
      assert.isTrue(struct.tiles[0].powersupplied);
      assert.isTrue(struct.tiles[0].conductive);
    });

    it('should handle flags off', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XBIT;
      let segment = Uint8Array.from([0, 0xFF]);
      handler(segment, struct);
      assert.isNotTrue(struct.tiles[0].saltwater);
      assert.isNotTrue(struct.tiles[0].watercover);
      assert.isNotTrue(struct.tiles[0].watersupplied);
      assert.isNotTrue(struct.tiles[0].piped);
      assert.isNotTrue(struct.tiles[0].powersupplied);
      assert.isNotTrue(struct.tiles[0].conductive);
    });
  });

  describe('xbld', () => {
    it('should parse building code', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XBLD;
      let segment = Uint8Array.from([0xCC, 0xFF]);
      handler(segment, struct);
      assert.equal(struct.tiles[0].building, 0xCC);
    });
    it('should parse building name', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XBLD;
      let segment = Uint8Array.from([0xCC, 0xFF]);
      handler(segment, struct);
      assert.equal(struct.tiles[0].buildingName, 'Solar power plant');
    });
  });

  describe('xter', () => {
    it('should parse dry slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x00]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [0,0,0,0], waterlevel: "dry"});
    });
    it('should parse submerged slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x1D]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [1,1,1,1], waterlevel: "submerged"});
    });
    it('should parse shore slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x25]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [1,1,0,1], waterlevel: "shore"});
    });
    it('should parse a waterfall', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x3E]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [0,0,0,0], waterlevel: "waterfall"});
    });
    it('should parse surface water slope', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x33]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [0,0,1,1], waterlevel: "surface"});
    });
    it('should parse surface water canal', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x41]);
      handler(segment, struct);
      assert.deepEqual(struct.tiles[0].terrain, {slope: [0,0,0,0], waterlevel: "surface", surfaceWater: [0,1,1,0]});
    });
  });

  describe('xund', () => {

  });

  describe('xzon', () => {

  });

  describe('xtxt', () => {

  });

  describe('xlab', () => {

  });

  describe('misc', () => {

  });
});
