var path = require('path');

/**
 * Resolves a pathname to an absolute pathname.
 * Handles ~/ references and environmental variables.
 *
 * Example:
 *  Say you have the $DATA environmental variable set to 'app/config'
 *
 *  You call: resolve('~/$DATA/file.log')
 *  Result would be something like: '/home/username/app/config/file.log'
 */
exports.resolve = function(pathname) {
  if(typeof pathname !== 'string') {
    pathname = '';
  }

  // resolve ~/
  pathname = pathname.replace('~/', process.env.HOME + '/');

  // resolve env variables
  pathname = pathname.replace(/\$(\w*)/g, function() { 
    var env = process.env[arguments[1]];
    if(env) {
      return env;
    } else {
      return '';
    }
  });

  return path.resolve(pathname);
};
