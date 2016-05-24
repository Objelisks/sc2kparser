"use strict"
let mocha = require('mocha');
let assert = require('chai').assert;
let parser = require('./sc2kparser.js');

describe('decompressSegment', () => {
  let compressedSegment = Uint8Array.from([2, 34, 55, 130, 255]);
  let decompressed = parser.decompressSegment(compressedSegment);
  let expected = Uint8Array.from([34, 55, 255, 255, 255]);
  it('should decompress correctly', () => {
    assert.deepEqual(expected, decompressed);
  });
});

describe('splitIntoSegments', () => {
  let arr = [65,66,67,68, 0,0,0,4, 3,1,2,3];
  let fileBytes = Uint8Array.from(arr);
  let segments = parser.splitIntoSegments(fileBytes);
  let expected = {
    "ABCD": Uint8Array.from([1, 2, 3])
  };
  it('should split into segments', () => {
    assert.deepEqual(expected, segments);
  });
});

describe('segment handlers', () => {

  describe('altm', () => {
    it('should parse altitude data', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.ALTM;
      let segment = Uint8Array.from([0x00, 0x81, 0x00, 0x08]);
      handler(segment, struct);
      assert.equal(50, struct.tiles[0].alt);
      assert.isTrue(struct.tiles[0].water);
      assert.equal(400, struct.tiles[1].alt);
      assert.isNotTrue(struct.tiles[1].water);
    });
  });

  describe('cnam', () => {
    it('should parse name data', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.CNAM;
      let segment = Uint8Array.from([5, 104, 101, 108, 108, 111]);
      handler(segment, struct);
      assert.equal('hello', struct.cityName);
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
      assert.equal(0xCC, struct.tiles[0].building);
    });
    it('should parse building name', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XBLD;
      let segment = Uint8Array.from([0xCC, 0xFF]);
      handler(segment, struct);
      assert.equal('Solar power plant', struct.tiles[0].buildingName);
    });
  });

  describe('xter', () => {
    it('should parse dry slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x00]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,0,0], waterlevel: "dry"}, struct.tiles[0].terrain);
    });
    it('should parse submerged slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x1D]);
      handler(segment, struct);
      assert.deepEqual({slope: [1,1,1,1], waterlevel: "submerged"}, struct.tiles[0].terrain);
    });
    it('should parse shore slopes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x25]);
      handler(segment, struct);
      assert.deepEqual({slope: [1,1,0,1], waterlevel: "shore"}, struct.tiles[0].terrain);
    });
    it('should parse a waterfall', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x3E]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,0,0], waterlevel: "waterfall"}, struct.tiles[0].terrain);
    });
    it('should parse surface water slope', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x33]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,1,1], waterlevel: "surface"}, struct.tiles[0].terrain);
    });
    it('should parse surface water canal', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTER;
      let segment = Uint8Array.from([0x41]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,0,0], waterlevel: "surface", surfaceWater: [0,1,1,0]}, struct.tiles[0].terrain);
    });
  });

  describe('xund', () => {
    it('should parse subways', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XUND;
      let segment = Uint8Array.from([0x09]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,1,0,0], subway: true}, struct.tiles[0].underground);
    });
    it('should parse pipes', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XUND;
      let segment = Uint8Array.from([0x18]);
      handler(segment, struct);
      assert.deepEqual({slope: [1,1,1,0], pipes: true}, struct.tiles[0].underground);
    });
    it('should parse crossovers', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XUND;
      let segment = Uint8Array.from([0x1F]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,0,0], subway: true, pipes: true, subwayLeftRight: true}, struct.tiles[0].underground);
    });
    it('should parse stations', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XUND;
      let segment = Uint8Array.from([0x23]);
      handler(segment, struct);
      assert.deepEqual({slope: [0,0,0,0], station: true}, struct.tiles[0].underground);
    });
  });

  describe('xzon', () => {
    it('should parse a 1x1 zone', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XZON;
      let segment = Uint8Array.from([0xF4]);
      handler(segment, struct);
      assert.deepEqual({topLeft: true, topRight: true, bottomLeft: true, bottomRight: true, type: 4}, struct.tiles[0].zone);
    });
    it('should parse a 4x4 zone', () => {
      let struct = {tiles:[{}, {}, {}, {}]};
      let handler = parser.segmentHandlers.XZON;
      let segment = Uint8Array.from([0x87, 0x17, 0x47, 0x27]);
      handler(segment, struct);
      assert.deepEqual({topLeft: true, topRight: false, bottomLeft: false, bottomRight: false, type: 7}, struct.tiles[0].zone);
      assert.deepEqual({topLeft: false, topRight: true, bottomLeft: false, bottomRight: false, type: 7}, struct.tiles[1].zone);
      assert.deepEqual({topLeft: false, topRight: false, bottomLeft: true, bottomRight: false, type: 7}, struct.tiles[2].zone);
      assert.deepEqual({topLeft: false, topRight: false, bottomLeft: false, bottomRight: true, type: 7}, struct.tiles[3].zone);
    });
  });

  describe('xtxt', () => {
    it('should recognize no sign set', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTXT;
      let segment = Uint8Array.from([0x00]);
      handler(segment, struct);
      assert.isUndefined(struct.tiles[0].sign);
    });
    it('should recognize sign set', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XTXT;
      let segment = Uint8Array.from([0x08]);
      handler(segment, struct);
      assert.isDefined(struct.tiles[0].sign);
      assert.equal(struct.tiles[0].sign, 8);
    });
  });

  describe('xlab', () => {
    it('should parse empty label', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XLAB;
      let segment = Uint8Array.from([
        0x00, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
        0x0B, 104, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
      handler(segment, struct);
      assert.isDefined(struct.labels[0]);
      assert.isDefined(struct.labels[1]);
      assert.equal(struct.labels[0], '');
      assert.equal(struct.labels[1], 'hello world');
    });
    it('should parse short label', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XLAB;
      let segment = Uint8Array.from([
        0x06, 102, 103, 115, 102, 100, 115, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
        0x0B, 104, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
      handler(segment, struct);
      assert.isDefined(struct.labels[0]);
      assert.isDefined(struct.labels[1]);
      assert.equal(struct.labels[0], 'fgsfds');
      assert.equal(struct.labels[1], 'hello world');
    });
    it('should parse max length label', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XLAB;
      let segment = Uint8Array.from([
        0x18, 116, 119, 101, 110, 116, 121,  32, 102, 111, 117, 114,  32,  99, 104,  97, 114,  97,  99, 116, 101, 114, 115,  32, 120,
        0x0B, 104, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
      handler(segment, struct);
      assert.isDefined(struct.labels[0]);
      assert.isDefined(struct.labels[1]);
      assert.equal(struct.labels[0], 'twenty four characters x');
      assert.equal(struct.labels[1], 'hello world');
    });
    it('should parse overflow label', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.XLAB;
      let segment = Uint8Array.from([
        0xFF, 116, 119, 101, 110, 116, 121,  32, 102, 111, 117, 114,  32,  99, 104,  97, 114,  97,  99, 116, 101, 114, 115,  32, 120,
        0x0B, 104, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
      handler(segment, struct);
      assert.isDefined(struct.labels[0]);
      assert.isDefined(struct.labels[1]);
      assert.equal(struct.labels[0], 'twenty four characters x');
      assert.equal(struct.labels[1], 'hello world');
    });
  });

  describe('misc', () => {
    it('should parse some of the misc data', () => {
      let struct = {tiles:[{}, {}, {}]};
      let handler = parser.segmentHandlers.MISC;
      let segment = new Int32Array(21);
      let view = new DataView(segment.buffer);
      view.setInt32(3*4, 1950);
      view.setInt32(5*4, 9999);
      view.setInt32(20*4, 100000);
      handler(segment, struct);
      assert.equal(1950, struct.founded);
      assert.equal(9999, struct.money);
      assert.equal(100000, struct.population);
    });
  });
});
