SC2kParser.js
=============

This is a module that parses SimCity 2000 save files (\*.SC2)

Output
======

After the file is parsed, the parser returns a map of coordinates to tile info objects.

The coordinate keys look like:
```
// for x,y = 0 to 127
var x = 32, y = 50;
tiles[x + ':' + y] = {...}
```

The tile info objects look like:
```
{
  cool: stufff
}
```

Usage
=====

Pass a typed array of bytes to the parse function like this:
```
var sc2kparser = require('sc2kparser');

// get file bytes somehow
var bytes = new Uint8Array(...);

let tiles = sc2kparser.parse(bytes);
console.log(tiles);
```

Here is an easy way to get a sc2k save file in the browser:
```
document.body.addEventListener('dragover', function(event) {
  event.preventDefault();
  event.stopPropagation();
}, false);
document.body.addEventListener('drop', function(event) {
  event.preventDefault();
  event.stopPropagation();

  var file = event.dataTransfer.files[0];
  var fileReader = new FileReader();
  fileReader.onload = function(e) {
    var bytes = new Uint8Array(e.target.result);
    let tiles = sc2kparser.parse(bytes);
    console.log(tiles);
  };
  fileReader.readAsArrayBuffer(file);
}, false);
```

Thanks
======

Thanks to David Moews for his documentation of the file format. (simcity-2000-info.txt)


License
=======

MIT
