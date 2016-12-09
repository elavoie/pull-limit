[![Build Status](https://travis-ci.org/elavoie/pull-limit.svg?branch=master)](https://travis-ci.org/elavoie/pull-limit)

Limits the total number of items inside a through pull-stream. 

Defaults to 1. Once the limit has been reached, a newer item will be read only
after a previous item has been drained.

Useful for limiting the rate of eager processing pipelines or for waiting for
answers before sending more elements on a duplex transport, such as WebSockets.

Quick Examples
==============

With a through pull-stream:

    var pull = require('pull-stream')
    var buffer = require('pull-eager-buffer')
    var limit = require('pull-limit')

    // Prints 0,0,1,1,2,2
    pull(
      pull.count(2),
      pull.through(console.log),
      limit(buffer()),
      pull.through(console.log),
      pull.drain()
    )

With a WebSocket, so that only one value is in transit and processed at a time.
The next value is only sent when the result has been received. Otherwise, the
socket would eagerly pull all the values:

    var pull = require('pull-stream')
    var ws = require('pull-ws')
    var limit = require('pull-limit')

    var server = ws.createServer(function (stream) {
      pull(
        stream, 
        pull.map(function (x) { return x.toLowerCase() }), 
        stream
    )
    }).listen(5000)

    ws.connect('ws://localhost:5000', function (err, stream) {
      if (err) throw err
        
      // Prints 'A', 'a', 'B', 'b', 'C', 'c'
      pull(
        pull.values(['A', 'B', 'C']),
        pull.through(console.log),
        limit(stream),
        pull.through(console.log),
        pull.drain()      
      )
    }) 

Signature
=========

The following signature follows the [js module signature
syntax](https://github.com/elavoie/js-module-signature-syntax) and conventions.
All callbacks (parameters ending with 'cb') have the '(err, data)' signature.
    
    limit: (stream: {
        sink: (streamRead: (abort, streamSinkCb)),
        source: (abort, cb)
    }, ?n: number) =>
    {
        sink: (read (abort, sinkCb)),
        source: (abort, cb)
    }


Properties
==========

1. *read* is called once iff *streamRead* has been called.
2. The first time *streamRead* is called, *streamSinkCb* will complete with the
   value coming from *sinkCb* as soon as it is available.
3. For every subsequent *streamRead* call, *streamSinkCb* will only complete
   either after the stream closes or the number of elements sinked into
   *stream.sink* but not sourced by *stream.source* is below n, with n having a
   default value of 1.
