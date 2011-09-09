
var d = require('d-utils')
  , ctrl = require('ctrlflow')
  , fs = require('fs')
  , path = require('path')

var search = exports = module.exports = function (files, opts, callback) {

  if ('string' === typeof files)
    files = [files]
  if(!callback)
    callback = opts, opts = {}
  var prune = opts.prune
    , maxDepth = opts.recursive === false ? 1 : opts.maxDepth

  //given list of files
  //stat each file
  //  if it's a directory
  //    recurse

  var ls = function (dir, cb) {    
    ctrl([
      fs.readdir
    , ctrl.toAsync(d.curry(d.map, 0, d.curry(path.join, dir, 0) ))
    ]) (dir, cb)
  }

  var stat = function (filename, callback) {
    fs.lstat(filename, function (err, stat) {
      if (err) return callback(err)
      stat.path = filename
      callback(null, stat)
    })
  }

  var seen  = []
    , paths = []
    , stats = []

  function r (files, depth, callback) { //pass in depth
    //if(!callback) callback = depth, depth = -1
    ctrl.parallel.map(
      ctrl([
        opts.strict != false ? stat : d.tryCatchPass(stat, function (err, cb) {cb(null, null)})
      , function (file, callback) {
          if(!file || prune && prune(file)) return callback()
          if(-1 !== seen.indexOf(file.ino)) return callback()

          seen .push(file.ino)
          paths.push(file.path)
          stats.push(file)

          if (file.isDirectory() && (maxDepth ? depth <= maxDepth : true))
            ctrl([ls, d.curry(r, 0, depth + 1, -1)]) (file.path, callback)
          else 
            callback(null, file)
        }
      ])
    ) (files, d.curry(callback, 0, paths, stats))
  }
  r(files, 0, callback)
}

if(!module.parent) {
 
  var opts = require('optimist').argv
    , args = opts._.length ? opts._ : process.cwd()
    , exclude = opts.exclude ? new RegExp(opts.exclude) : /^\.git|node_modules/

  console.log(exclude)
  //ignore git and node
  opts.prune = function filter (file) {
      return /*/\.git/.exec(file.name || /node_modules/.exec(file.path) ||*/ (exclude && exclude.exec(file.path))
    }
 
  search(args, opts, function (err, files, stats) {
    if(err) throw err
    d.map(files /*d.filter(files, /\.js$/)*/, d.curry(console.log, 0))
  })
}
