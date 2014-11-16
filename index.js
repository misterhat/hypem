var stream = require('stream'),

    cheerio = require('cheerio'),
    clone = require('clone'),
    lazystream = require('lazystream'),
    needle = require('needle');

function art(images, options) {
    var artwork = new lazystream.Readable(function () {
        var out = new stream.PassThrough(),
            largest = images.large || images.medium || images.small;

        if (!largest) {
            process.nextTick(function () {
                out.emit('error', new Error('No artwork found!'));
            });
        } else {
            needle.get(largest, options).pipe(out);
        }

        return out;
    });

    ['small', 'medium', 'large'].forEach(function (size) {
        artwork[size] = new lazystream.Readable(function () {
            var out = new stream.PassThrough();

            if (!images[size]) {
                process.nextTick(function () {
                    out.emit(new Error('No ' + size + ' artwork found!'));
                });
            } else {
                needle.get(images[size], options).pipe(out);
            }

            return out;
        });
    });

    return artwork;
}

function song(id, base) {
    var out = new stream.PassThrough(),
        options;

    base = base || {};
    options = clone(base);

    options.headers = options.headers || {};
    options.follow = true;

    needle.head('http://hypem.com', options, function (err, res) {
        var cookie, url;

        if (err) {
            return process.nextTick(function () {
                out.emit('error', err);
            });
        }

        cookie = res.headers['set-cookie'] || [ '' ];
        cookie = cookie[0].split(';')[0];

        url = 'http://hypem.com/track/' + id + '/?ax=1';

        options.headers.cookie = cookie;

        needle.get(url, options, function (err, res, body) {
            var $, key, url;

            if (err) {
                return process.nextTick(function () {
                    out.emit('error', err);
                });
            }

            try {
                $ = cheerio.load(body);
            } catch (e) {
                return console.log(e);
            }

            key = $('#displayList-data').html();

            if (!key) {
                return process.nextTick(function () {
                    out.emit('error', new Error('No track information found.'));
                });
            }

            try {
                key = JSON.parse(key).tracks[0].key;
            } catch (e) {
                return process.nextTick(function () {
                    out.emit('error', new Error('Unable to parse key.'));
                });
            }

            url =
                'http://hypem.com/serve/source/' + id + '/' + key + '?_=' +
                Date.now();

            needle.get(url, options, function (err, res, body) {
                if (err) {
                    return process.nextTick(function () {
                        out.emit('error', err);
                    });
                }

                if (!body.url) {
                    return process.nextTick(function () {
                        out.emit('error', new Error('No direct link found.'));
                    });
                }

                needle.get(body.url, options).pipe(out);
            });
        });
    });

    return out;
}

function search(entry, base, done) {
    var url, terms, sort, page, options;

    if (typeof entry === 'string') {
        terms = entry;
    } else {
        terms = entry.terms;
        page = entry.page;
        sort = entry.sort;
    }

    page = page || 1;
    sort = sort || 'favorite';

    if (!done) {
        done = base;
        base = {};
    }

    options = clone(base);

    terms = encodeURIComponent(terms);

    url =
        'http://hypem.com/playlist/search/' + terms + '/json/' + page +
        '/data.js';

    needle.request('get', url, {
        sortby: sort
    }, options, function (err, res, body) {
        var tracks;

        if (err) {
            return done(err);
        }

        delete body.version;

        tracks = Object.keys(body).sort().map(function (key) {
            var track = body[key];

            return {
                id: track.mediaid,
                artist: track.artist,
                title: track.title,
                duration: track.time,
                art: art({
                    small: track.thumb_url,
                    medium: track.thumb_url_medium,
                    large: track.thumb_url_large
                }, options),
                song: new lazystream.Readable(function () {
                    return song(track.mediaid, options);
                })
            };
        });

        done(null, tracks);
    });
}

module.exports.song = song;
module.exports.search = search;
