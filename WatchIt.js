var watch = require('nodewatch'),
    path  = require('./util/path'),
    spawn = require('child_process').spawn,
    fs    = require('fs');

var configfile = process.argv[2],
    configtext,
    config,
    filters = {},
    workInProgress = false;

// Make sure config file was specified
if(!configfile) {
  console.log("Usage: ", process.argv[0], " ", process.argv[1], " [config file]");
  process.exit(1);
}

// Load config from file
try {
  // Load JSON from file
  configtext = fs.readFileSync(configfile).toString();

  // Strip comments from JSON
  configtext = configtext.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*\*\//m, '');

  // Parse JSON
  config = JSON.parse(configtext);

  if( typeof config !== 'object' ) {
    throw new Error('Config could not be parsed as object. Malformed configuration file ' + configfile);
  }

  if( !config.paths || !(config.paths instanceof Array) || config.paths.length === 0 ) {
    throw new Error('Config object missing paths property. Please specify paths to watch in ' + configfile);
  }

  if( !config.filters || !(config.filters instanceof Array) || config.filters.length === 0 ) {
    throw new Error('Config object missing filters property. Please specify filters for watched files in ' + configfile);
  }
} catch(e) {
  console.log('ERROR: Exception thrown while loading config file:\n\n', e);
  process.exit(1);
}

// Add filters
config.filters.forEach( function(item) {
  var regexStr  = item.pattern,
      regex     = new RegExp(regexStr);

  filters[regexStr] = {
    regex:  regex,
    action: function(file) {
      var proc,
          args = item.action.slice(1);

      args.forEach( function(item, idx) {
        args[idx] = args[idx].replace(/\$0/g, file);
      });

      lock();
      proc = spawn( item.action[0], args );
      proc.stdout.on('data', function(data) {
        console.log(data.toString());
      });
      proc.on('exit', function() {
        unlock();
      });
    }
  };
});

// Add paths to watcher
config.paths.forEach( function(item) {
  var abspath,
      recursive;

  try {
    abspath = path.resolve(item.path);
    recursive = item.recursive;

    if( typeof recursive === 'undefined' ) {
      recursive = true;
    } else {
      recursive = Boolean(recursive);
    }

    watch.add( abspath, recursive);
    console.log( 'Watching ', abspath, (recursive) ? '' : '[non-recursive]' );
  } catch(e) {
    console.log('ERROR: could not initialize watcher.\n\n', e);
    process.exit(1);
  }
});

// Hook up change event listener
watch.onChange( onFilesChanged );

/**
 * Handle file change event from watcher
 */
function onFilesChanged( file, prev, curr, type ) {
  if( isLocked() ) return;
  Object.keys(filters).forEach( function(key) {
    var regex   = filters[key].regex,
        action  = filters[key].action;

    if( regex.test(file) ) {
      //console.log(type, file);
      action( file );
    }
  });
}

function lock() {
  workInProgress = true;
}

function unlock() {
  workInProgress = false;
}

function isLocked() {
  return workInProgress;
}

