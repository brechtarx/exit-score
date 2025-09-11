// Analytics adapter for GTM (and GA fallback)
(function() {
  var GTM_ID = 'GTM-WVNR86SP';

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // GTM container is loaded in index.html head; this module provides helpers

  // Safe event tracker
  window.trackEvent = function(eventName, params) {
    try {
      window.dataLayer.push(Object.assign({ event: eventName }, params || {}));
    } catch (e) {
      // no-op
    }
  };

  // Placeholder for future Meta/LinkedIn integration
  window.trackFBEvent = function(eventName, params) {
    if (typeof fbq === 'function') {
      try { fbq('track', eventName, params || {}); } catch (e) {}
    }
  };
})();
