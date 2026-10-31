(function (root) {
  'use strict';

  var allowedEvents = {
    lobby_view: true,
    pack_open: true,
    collection_view: true,
    deck_build_complete: true,
    battle_start: true,
    battle_complete: true,
    ranked_match_start: true,
    share_x: true,
    game_error: true
  };
  var sentKeys = {};

  function cleanValue(value) {
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    return String(value == null ? '' : value).slice(0, 100);
  }

  function cleanParams(params) {
    var output = { game_name: 'vocalu' };
    Object.keys(params || {}).slice(0, 20).forEach(function (key) {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return;
      output[key] = cleanValue(params[key]);
    });
    return output;
  }

  function event(name, params, options) {
    if (!allowedEvents[name]) return false;
    options = options || {};
    if (options.dedupeKey) {
      var key = name + ':' + options.dedupeKey;
      if (sentKeys[key]) return false;
      sentKeys[key] = true;
    }
    if (!root.VOCALU_ANALYTICS_ENABLED || typeof root.gtag !== 'function') return false;
    root.gtag('event', name, cleanParams(params));
    return true;
  }

  function error(kind, context) {
    kind = cleanValue(kind || 'unknown');
    context = cleanValue(context || 'game');
    return event('game_error', {
      error_type: kind,
      error_context: context
    }, { dedupeKey: kind + ':' + context });
  }

  root.VocaluAnalytics = {
    event: event,
    error: error,
    allowedEvents: Object.keys(allowedEvents)
  };
}(window));
