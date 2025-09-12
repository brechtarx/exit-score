// Analytics adapter for direct GA4 + optional Meta/LinkedIn
(function() {
  // GA4 event
  window.trackEvent = function(eventName, params) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', eventName, params || {});
      }
    } catch (e) { /* no-op */ }
  };

  // Meta Pixel custom/standard events
  window.trackFBEvent = function(eventName, params) {
    try {
      if (typeof fbq === 'function') {
        // Use standard events where appropriate, else trackCustom
        var standard = ['PageView','Lead','Contact','CompleteRegistration','Purchase','AddToCart'];
        if (standard.indexOf(eventName) !== -1) {
          fbq('track', eventName, params || {});
        } else {
          fbq('trackCustom', eventName, params || {});
        }
      }
    } catch (e) { /* no-op */ }
  };

  // LinkedIn: requires conversion ids; this is a no-op wrapper unless you supply one
  window.trackLinkedInEvent = function(conversionId) {
    try { if (typeof lintrk === 'function' && conversionId) lintrk('track', { conversion_id: conversionId }); } catch (e) {}
  };
})();
