#!/usr/bin/env node
var fs = require('fs'),
    util = require('util'),

    Table = require('easy-table'),
    hypem = require('./'),
    minimist = require('minimist'),
    truncate = require('truncate'),

    package = require('./package');

var argv = minimist(process.argv.slice(2)),
    terms = argv._[0],
    id = argv.i || argv.id,
    list = argv.l || argv.list,
    art = argv.a || argv.art,
    outfile = argv.o || argv.out,

    out;

function help() {
    console.log(util.format('%s - %s', package.name, package.version));
    console.log(package.description + '\n');

    console.log('Usage: hypem [<terms>] [options]');
    console.log(
        '\t<terms> being search criteria (an artist or song, for example).\n'
    );
    console.log('\t-h, --help\t\tDisplay this screen.\n');
    console.log(
        '\t-l, --list [<p>]\tSearch for tracks based on input terms. <p> is an'
    );
    console.log('\t\t\t\toptional integer describing which page to view.');
    console.log('\t-i, --id <id>\t\tRequest a single track based on ID.\n');
    console.log('\t-a, --art [<size>]\tGrab the artwork stream instead of the');
    console.log(
        '\t\t\t\tMP3 stream. Size can be "small", "medium" or "large".\n'
    );
    console.log('\t-o, --out <file>\tStream to download into a file. When');
    console.log('\t\t\t\tunspecified, dumps to STDOUT.');
}

if (argv.h || argv.help || (!id && !terms)) {
    return help();
}

if (outfile) {
    out = fs.createWriteStream(outfile);
} else {
    out = process.stdout;
}

if (id) {
    hypem.song(id).pipe(out);
    return;
}

hypem.search({
    terms: terms,
    page: list || 1
}, function (err, tracks) {
    var track;

    if (err) {
        return console.error(err);
    }

    if (!tracks.length) {
        return console.error(new Error('No tracks found!'));
    }

    if (list) {
        tracks = tracks.map(function (track) {
            var minutes = Math.floor(track.duration / 60),
                seconds = track.duration - (minutes * 60);

            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;

            return {
                id: track.id,
                artist: truncate(track.artist, 27),
                title: truncate(track.title, 27),
                duration: minutes + ':' + seconds
            };
        });

        tracks = Table.printArray(tracks, function (track, cell) {
            ['id', 'title', 'artist', 'duration'].forEach(function (field) {
                cell(field, track[field]);
            });
        });

        return console.log(tracks);
    }

    track = tracks[0];

    if (art) {
        if (['small', 'medium', 'large'].indexOf(art) > -1) {
            return track.art[art].pipe(process.stdout);
        }

        return track.art.pipe(process.stdout);
    }

    track.song.pipe(out);
});
