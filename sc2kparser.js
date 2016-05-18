"use strict"
/*
The data in most SimCity segments is compressed using a form of run-length
encoding.  When this is done, the data in the segment consists of a series
of chunks of two kinds.  The first kind of chunk has first byte from 1 to
127;  in this case the first byte is a count telling how many data bytes
follow.  The second kind of chunk has first byte from 129 to 255.  In this
case, if you subtract 127 from the first byte, you get a count telling how
many times the following single data byte is repeated.  Chunks with first
byte 0 or 128 never seem to occur.
*/
module.exports.decompressSegment = function(bytes) {
  let output = [];
  let dataCount = 0;

  for(let i=0; i<bytes.length; i++) {
    if(dataCount > 0) {
      output.push(bytes[i]);
      dataCount -= 1;
      continue;
    }

    if(bytes[i] < 128) {
      // data bytes
      dataCount = bytes[i];
    } else {
      // run-length encoded byte
      let repeatCount = bytes[i] - 127;
      let repeated = bytes[i+1];
      for(let i=0; i<repeatCount; i++) {
        output.push(repeated);
      }
      // skip the next byte
      i += 1;
    }
  }

  return Uint8Array.from(output);
};

let alreadyDecompressedSegments = {
  'ALTM': true,
  'CNAM': true
};

// split segments into a hash indexed by segment title
module.exports.splitIntoSegments = function(rest) {
  let segments = {};
  while(rest.length > 0) {
    let segmentTitle = Array.prototype.map.call(rest.subarray(0, 4), x => String.fromCharCode(x)).join('');
    let lengthBytes = rest.subarray(4, 8);
    let segmentLength = new DataView(lengthBytes.buffer).getUint32(lengthBytes.byteOffset);
    let segmentContent = rest.subarray(8, 8+segmentLength);
    if(!alreadyDecompressedSegments[segmentTitle]) {
      segmentContent = module.exports.decompressSegment(segmentContent);
    }
    segments[segmentTitle] = segmentContent;
    rest = rest.subarray(8+segmentLength);
  }
  return segments;
};

let xterSlopeMap = {
  0x0: [0,0,0,0],
  0x1: [1,1,0,0],
  0x2: [0,1,0,1],
  0x3: [0,0,1,1],
  0x4: [1,0,1,0],
  0x5: [1,1,0,1],
  0x6: [0,1,1,1],
  0x7: [1,0,1,1],
  0x8: [1,1,1,0],
  0x9: [0,1,0,0],
  0xA: [0,0,0,1],
  0xB: [0,0,1,0],
  0xC: [1,0,0,0],
  0xD: [1,1,1,1]
};

// NOTE: surf. water documetation inconsistency
// denotes which sides have land
let xterWaterMap = {
  0x0: [0,2], // left-right open canal
  0x1: [1,3], // top-bottom open canal
  0x2: [0,2,3], // right open bay
  0x3: [0,1,2], // left open bay
  0x4: [1,2,3], // top open bay
  0x5: [0,1,3]  // bottom open bay
};

// TODO: fill out building names
let buildingNames = {

};

module.exports.segmentHandlers = {
  'ALTM': (data, struct) => {
    // NOTE: documentation is weak on this segment
    // TODO: convert typed array views to DataView objects
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for(let i=0; i<data.byteLength/2; i++) {
      let square = view.getUint16(i*2);
      let altitude = (square & 0x001F) * 50;
      struct.tiles[i].alt = altitude;
      struct.tiles[i].water = (square & 0x0080) !== 0;
    }
  },
  'CNAM': (data, struct) => {
    let view = new Uint8Array(data);
    let len = view[0] & 0x3F; // limit to 32
    let strDat = view.subarray(1,1+len);
    struct.cityName = Array.prototype.map.call(strDat, x => String.fromCharCode(x)).join('');
  },
  'XBIT': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let tile = struct.tiles[i];
      tile.saltwater = (square & 0x01) !== 0;
      //tile.unknown = (square & 0x02) !== 0;
      tile.watercover = (square & 0x04) !== 0;
      //tile.unknown = (square & 0x08) !== 0;
      tile.watersupplied = (square & 0x10) !== 0;
      tile.piped = (square & 0x20) !== 0;
      tile.powersupplied = (square & 0x40) !== 0;
      tile.conductive = (square & 0x80) !== 0;
    });
  },
  'XBLD': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      struct.tiles[i].building = square;
      struct.tiles[i].buildingName = buildingNames[square];
    });
  },
  'XTER': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let terrain = {};
      if(square < 0x3E) {
        let slope = square & 0x0F;
        let wetness = (square & 0xF0) >> 4;
        terrain.slope = xterSlopeMap[slope];
        terrain.wetness = wetness;
      } else if(square === 0x3E) {
        terrain.slope = xterSlopeMap[0];
        terrain.waterfall = true;
      } else if(square >= 0x40) {
        let surfaceWater = square & 0x0F;
        terrain.slope = xterSlopeMap[0];
        terrain.surfaceWater = xterWaterMap[surfaceWater];
      }
      struct.tiles[i].terrain = terrain;
    });
  },
  'XUND': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let underground = {};
      if(square < 0x20) {
        let slope = square & 0x0F;
        underground.slope = xterSlopeMap[slope];
        if((square & 0xF0) === 0x00) {
          underground.subway = true;
        } else if((square & 0xF0) === 0x10 && square < 0x1F) {
          underground.pipes = true;
        }
      } else if(square === 0x1F || square === 0x20) {
        underground.subway = true;
        underground.pipes = true;
        underground.subwayLeftRight = square === 0x1F;
      } else if(square === 0x23) {
        underground.subwayStation = true;
      }
      struct.tiles[i].underground = underground;
    });
  },
  'XZON': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let zone = {};
      zone.topLeft = (square & 0x80) !== 0;
      zone.topRight = (square & 0x40) !== 0;
      zone.bottomLeft = (square & 0x20) !== 0;
      zone.bottomRight = (square & 0x10) !== 0;
      zone.type = square & 0x0F;
      struct.tiles[i].zone = zone;
    });
  },
  'XTXT': (data, struct) => {
    // idk
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      if(square !== 0) {
        struct.tiles[i].sign = square;
      }
    });
  },
  'XLAB': (data, struct) => {
    // labels (1 byte len + 24 byte string)
    let view = new Uint8Array(data);
    let labels = [];
    for(let i=0; i<256; i++) {
      let labelPos = i*25;
      let labelLength = view[labelPos];
      let labelData = view.subarray(labelPos+1, labelPos+1+labelLength);
      labels[i] = Array.prototype.map.call(labelData, x => String.fromCharCode(x)).join('');
    }
  },
  'MISC': (data, struct) => {
    let view = new Uint32Array(data);
    struct.founded = view[3];
    struct.daysElapsed = view[4];
    struct.money = view[5];
    struct.population = view[20];
    // TODO: classify rest of misc data
  }
  // TODO: XMIC, XTHG, XGRP, XPLC, XFIR, XPOP, XROG, XPLT, XVAL, XCRM, XTRF
};

// decompress and interpret bytes into a combined tiles format
module.exports.toVerboseFormat = function(segments) {
  let struct = {};
  struct.tiles = [];
  for(let i=0; i<128*128; i++) {
    struct.tiles.push({});
  }

  Object.keys(segments).forEach((segmentTitle) => {
    let data = segments[segmentTitle];
    let handler = module.exports.segmentHandlers[segmentTitle];
    if(handler) {
      handler(data, struct);
    }
  });
  return struct;
};

// bytes -> file segments decompressed
module.exports.parse = function(bytes, options) {
  let buffer = new Uint8Array(bytes);
  let fileHeader = buffer.subarray(0, 12);
  let rest = buffer.subarray(12);
  let segments = module.exports.splitIntoSegments(rest);
  let struct = module.exports.toVerboseFormat(segments);
  return struct;
};

// check header bytes
module.exports.isSimCity2000SaveFile = function(bytes) {
  // check IFF header
  if(bytes[0] !== 0x46 ||
     bytes[1] !== 0x4F ||
     bytes[2] !== 0x52 ||
     bytes[3] !== 0x4D) {
    return false;
  }

  // check sc2k header
  if(bytes[8] !== 0x53 ||
     bytes[9] !== 0x43 ||
     bytes[10] !== 0x44 ||
     bytes[11] !== 0x48) {
    return false;
  }

  return true;
}
