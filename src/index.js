var toObject = require('pull-stream-function-to-object')

module.exports = function (stream, n) {
  n = n || 1
  var _read, _streamSinkCb
  var started = false
  var ended = false
  var inProcess = 0

  if (typeof stream === 'function') {
    stream = toObject(stream)
  }

  if (!stream.source || !stream.sink) {
    throw new Error('Through stream expected with both a sink and a source')
  }

  function close (err, cb) {
    var streamSinkCb
    if (_streamSinkCb) {
      streamSinkCb = _streamSinkCb
      _streamSinkCb = null
    }

    if (ended) {
      if (cb) cb(ended)
      if (streamSinkCb) cb(ended)
      return
    }
    ended = err
    if (_read) _read(ended, function () {})
    if (streamSinkCb) streamSinkCb(ended)
    if (cb) cb(ended)
  }

  function read () {
    if (!_read) return
    if (!_streamSinkCb) return

    var streamSinkCb

    if (!started) {
      started = true

      streamSinkCb = _streamSinkCb
      _streamSinkCb = null

      inProcess++
      _read(ended, streamSinkCb)
    } else if (inProcess < n) {
      streamSinkCb = _streamSinkCb
      _streamSinkCb = null

      inProcess++
      _read(ended, streamSinkCb)
    }
  }

  return {
    sink: function (__read) {
      _read = __read
      stream.sink(function streamRead (abort, streamSinkCb) {
        if (ended) return streamSinkCb(ended)

        _streamSinkCb = function (err, data) {
          streamSinkCb(err, data)
        }
        if (abort) return close(abort)

        read()
      })
    },
    source: function (abort, cb) {
      if (abort) return close(abort, cb)

      stream.source(null, function (err, data) {
        if (err) {
          return close(err, cb)
        }

        inProcess--
        cb(err, data)
        read()
      })
    }
  }
}
