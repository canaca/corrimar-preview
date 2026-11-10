// Reads the optional ?src= tag (for example ?src=sample from the QR sticker). Pure, testable in Node.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PreorderSource = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var SAFE = /^[a-z0-9_-]{1,32}$/;
  function clean(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase();
    return SAFE.test(s) ? s : "";
  }
  // search: a location.search string. stored: a value saved earlier this session, if any.
  function parseSource(search, stored) {
    var fromUrl = "";
    try {
      var q = String(search || "").replace(/^\?/, "");
      q.split("&").forEach(function (pair) {
        var i = pair.indexOf("=");
        var k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, " "));
        if (k === "src" && !fromUrl) fromUrl = clean(decodeURIComponent((i < 0 ? "" : pair.slice(i + 1)).replace(/\+/g, " ")));
      });
    } catch (e) { fromUrl = ""; }
    return fromUrl || clean(stored) || "direct";
  }
  function isSample(source, list) {
    return (list || ["sample"]).indexOf(source) !== -1;
  }
  return { parseSource: parseSource, isSample: isSample, clean: clean };
});
