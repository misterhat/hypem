# hypem-stream
Search and stream music from Hype Machine! Provides a simple, node-friendly
interface to access Hype Machine's search, art and music download streams. All
of the strams are lazy so feel free to store as many references as you please.
*hypem* also supports the command-line. See the *CLI* section for more details.

## Installation
For the module:

    $ npm install hypem-stream

For the CLI program:

    $ npm install -g hypem-stream

## Examples
```javascript
var fs = require('fs');
var hypem = require('hypem-stream');

hypem.search('allah las catamaran', function (err, tracks) {
    var track;

    if (err) {
        return console.error(err);
    }

    track = tracks[0];

    track.art.pipe(fs.createWriteStream('album.jpg'));
    track.song.pipe(fs.createWriteStream('catamaran.mp3'));
});
```

## API
Any stream refered to as *"lazy"* is a reference to
[lazystream](https://www.npmjs.org/package/lazystream). This means that you can
accumulate as many as you want in memory without comitting to downloading each,
yet still treat them like vanilla readable streams.

### track
```javascript
{
    title, artist, duration,
    art: { large, medium, small },
    song
}
```

`art` is an object containing references to three lazy, readable streams. Each
reference a JPEG image download, usually of the album art.
`art` itself is also a readable stream which returns the largest image.

`song` is a lazy reference to the readable download stream.

### hypem.song(entry, [options])
Return a readable stream of a song (almost always MP3).

`entry` is expected to be an object with `title` and `artist`, or a string
containing a *hypem* identifier.

`options` is an optional object that is passed into the
[needle](https://www.npmjs.org/package/needle) requests required. This is
provided to allow one to set custom timeouts or user agents.

### hypem.search(entry, [options], callback)
Search for tracks on the *hypem* website.

`entry` is expected to be either a string or an object. If it's a string, then
it's considered to be `entry.terms` and the other fields are defaulted.

`entry.terms` is a string containing the search criteria you wish to perform.
Usually a song title or artist name.

`entry.sort` is an optional string that should be `"favorite"`, `"blogged"` or
`"new"`. By default, `entry.sort` is set to `"favorite"`.

`entry.page` is an optional integer describing which page to begin scraping at.
By default it's set to `1`.

`options` is an optional object with the same criteria as `hypem.song`'s
`options`.

`callback` returns an array of `track`s.

## CLI
```
Usage: hypem [<terms>] [options]
        <terms> being search criteria (an artist or song, for example).

        -h, --help              Display this screen.

        -l, --list [<p>]        Search for tracks based on input terms. <p> is an
                                optional integer describing which page to view.
        -i, --id <id>           Request a single track based on ID.

        -a, --art [<size>]      Grab the artwork stream instead of the
                                MP3 stream. Size can be "small", "medium" or "large".

        -o, --out <file>        Stream to download into a file. When
                                unspecified, dumps to STDOUT.
```

### Examples
    $ hypem catamaran | mplayer -cache 4096 -
    $ hypem catamaran --art medium > album.jpeg
    $ hypem the\ beatles --list 1

## License
MIT
