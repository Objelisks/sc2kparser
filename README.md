SC2kParser.js
=============

This is a module that parses SimCity 2000 save files (\*.SC2)

Output
======

After the file is parsed, the parser returns a map of coordinates to tile info objects.

The struct looks like:
```
{
  tiles: [
    {
      x: 4,
      y: 6,
      
    }
  ],
  meta: {
    founded: 34,
    money: 1000,
    population: 5943
  }
}
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
let sc2kparser = require('sc2kparser');

// get file bytes somehow
let bytes = new Uint8Array(...);

let struct = sc2kparser.parse(bytes);
console.log(struct);
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

  let file = event.dataTransfer.files[0];
  let fileReader = new FileReader();
  fileReader.onload = function(e) {
    let bytes = new Uint8Array(e.target.result);
    let struct = sc2kparser.parse(bytes);
    console.log(struct);
  };
  fileReader.readAsArrayBuffer(file);
}, false);
```

Thanks
======

Thanks to David Moews for his documentation of the file format. (simcity-2000-info.txt)


License
=======

ISC
