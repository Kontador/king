(function() {

  var i, pair;

  var href = window.location.href, start, end, paramsString, pairs,
      pageParams = {};
  if (href.indexOf('?') > 0) {
    start = href.indexOf('?') + 1;
    end = href.indexOf('#') > 0 ? href.indexOf('#') : href.length;
    paramsString = href.substring(start, end);
    pairs = paramsString.split(/[&;]/);
    for (i = 0; i < pairs.length; ++i) {
      pair = pairs[i].split('=');
      if (pair[0]) {
          pageParams[decodeURIComponent(pair[0])] =
              decodeURIComponent(pair[1]);
      }
    }
  }

  var scripts = document.getElementsByTagName('script');
  var src, index, search, chunks, scriptParams = {};
  for (i = scripts.length - 1; i >= 0; --i) {
    src = scripts[i].getAttribute('src');
    if (~(index = src.indexOf('app-loader.js?'))) {
      search = src.substr(index + 10);
      chunks = search ? search.split('&') : [];
      for (i = chunks.length - 1; i >= 0; --i) {
        pair = chunks[i].split('=');
        if (pair[0]) {
          scriptParams[decodeURIComponent(pair[0])] =
              decodeURIComponent(pair[1]);
        }
      }
      break;
    }
  }

  var raw = pageParams.mode && pageParams.mode.toLowerCase() === 'raw';

  var scriptId = encodeURIComponent(scriptParams.id);
  if (!raw) {
    document.write('<scr' + 'ipt type="text/javascript" src="../build/ol.js"></scr' + 'ipt>');
  } else {
    window.CLOSURE_NO_DEPS = true; // we've got our own deps file
    document.write('<scr' + 'ipt type="text/javascript" src="../closure-library/closure/goog/base.js"></scr' + 'ipt>');
    document.write('<scr' + 'ipt type="text/javascript" src="../build/ol-deps.js"></scr' + 'ipt>');
    document.write('<scr' + 'ipt type="text/javascript" src="' + scriptId + '-require.js"></scr' + 'ipt>');
  }
  document.write('<scr' + 'ipt type="text/javascript" src="' + scriptId + '.js"></scr' + 'ipt>');
}());
