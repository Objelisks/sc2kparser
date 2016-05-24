(function() {
"use strict"

let sc2kparser = {};
let buildingNames = require('./buildingNames.json');

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
sc2kparser.decompressSegment = function(bytes) {
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
sc2kparser.splitIntoSegments = function(rest) {
  let segments = {};
  while(rest.length > 0) {
    let segmentTitle = Array.prototype.map.call(rest.subarray(0, 4), x => String.fromCharCode(x)).join('');
    let lengthBytes = rest.subarray(4, 8);
    let segmentLength = new DataView(lengthBytes.buffer).getUint32(lengthBytes.byteOffset);
    let segmentContent = rest.subarray(8, 8+segmentLength);
    if(!alreadyDecompressedSegments[segmentTitle]) {
      segmentContent = sc2kparser.decompressSegment(segmentContent);
    }
    segments[segmentTitle] = segmentContent;
    rest = rest.subarray(8+segmentLength);
  }
  return segments;
};

// slopes define the relative heights of corners from left to right
// i.e.: [0,0,1,1] =>
// 0   0   top
//
// 1   1   bottom
// which is a slope where the top side is at this tile's altitude, and the bottom
// side is at the next altitude level
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
//     0
//   .___.
// 1 |   | 2
//   |___|
//     3
let xterWaterMap = {
  0x0: [1,0,0,1], // left-right open canal
  0x1: [0,1,1,0], // top-bottom open canal
  0x2: [1,1,0,1], // right open bay
  0x3: [1,0,1,1], // left open bay
  0x4: [0,1,1,1], // top open bay
  0x5: [1,1,1,0]  // bottom open bay
};

let waterLevels = {
  0x0: "dry",
  0x1: "submerged",
  0x2: "shore",
  0x3: "surface",
  0x4: "waterfall"
};

sc2kparser.segmentHandlers = {
  'ALTM': (data, struct) => {
    // NOTE: documentation is weak on this segment
    // NOTE: uses DataView instead of typed array, because we need non-aligned access to 16bit ints
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
      struct.tiles[i].buildingName = buildingNames[square.toString(16).toUpperCase()];
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
        terrain.waterlevel = waterLevels[wetness];
      } else if(square === 0x3E) {
        terrain.slope = xterSlopeMap[0];
        terrain.waterlevel = waterLevels[0x4];
      } else if(square >= 0x40) {
        let surfaceWater = square & 0x0F;
        terrain.slope = xterSlopeMap[0];
        terrain.surfaceWater = xterWaterMap[surfaceWater];
        terrain.waterlevel = waterLevels[0x3];
      }
      struct.tiles[i].terrain = terrain;
    });
  },
  'XUND': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let underground = {};
      if(square < 0x1E) {
        let slope = square & 0x0F;
        underground.slope = xterSlopeMap[slope];
        if((square & 0xF0) === 0x00) {
          underground.subway = true;
        } else if(((square & 0xF0) === 0x10) && (square < 0x1F)) {
          underground.pipes = true;
        }
      } else if((square === 0x1F) || (square === 0x20)) {
        underground.subway = true;
        underground.pipes = true;
        underground.slope = xterSlopeMap[0x0];
        underground.subwayLeftRight = square === 0x1F;
      } else if(square === 0x23) {
        underground.station = true;
        underground.slope = xterSlopeMap[0x0];
      }
      struct.tiles[i].underground = underground;
    });
  },
  'XZON': (data, struct) => {
    let view = new Uint8Array(data);
    view.forEach((square, i) => {
      let zone = {};
      zone.topLeft = (square & 0x80) !== 0;
      zone.topRight = (square & 0x10) !== 0;
      zone.bottomLeft = (square & 0x40) !== 0;
      zone.bottomRight = (square & 0x20) !== 0;
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
      let labelLength = Math.max(0, Math.min(view[labelPos], 24));
      let labelData = view.subarray(labelPos+1, labelPos+1+labelLength);
      labels[i] = Array.prototype.map.call(labelData, x => String.fromCharCode(x)).join('');
    }
    struct.labels = labels;
  },
  'MISC': (data, struct) => {
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    struct.first = view.getInt32(0);
    struct.founded = view.getInt32(3*4);
    struct.daysElapsed = view.getInt32(4*4);
    struct.money = view.getInt32(5*4);
    struct.population = view.getInt32(20*4);
    // TODO: classify rest of misc data
  }
  // TODO: XMIC, XTHG, XGRP, XPLC, XFIR, XPOP, XROG, XPLT, XVAL, XCRM, XTRF
};

// decompress and interpret bytes into a combined tiles format
sc2kparser.toVerboseFormat = function(segments) {
  let struct = {};
  struct.tiles = [];
  for(let i=0; i<128*128; i++) {
    struct.tiles.push({});
  }

  Object.keys(segments).forEach((segmentTitle) => {
    let data = segments[segmentTitle];
    let handler = sc2kparser.segmentHandlers[segmentTitle];
    if(handler) {
      handler(data, struct);
    }
  });
  return struct;
};

// bytes -> file segments decompressed
sc2kparser.parse = function(bytes, options) {
  let buffer = new Uint8Array(bytes);
  let fileHeader = buffer.subarray(0, 12);
  let rest = buffer.subarray(12);
  let segments = sc2kparser.splitIntoSegments(rest);
  let struct = sc2kparser.toVerboseFormat(segments);
  return struct;
};

// check header bytes
sc2kparser.isSimCity2000SaveFile = function(bytes) {
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

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = sc2kparser;
} else {
  window.sc2kparser = sc2kparser;
}

})();
