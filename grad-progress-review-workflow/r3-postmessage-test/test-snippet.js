/* Run in the tab the R3 page opened (MyGrad or the Time Schedule).
   It stands in for the bookmarklet's "send to the app" step. */
(function () {
  if (!window.opener) { alert('R3: no opener link. The app tab cannot be reached from here.'); return; }
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'r3-ack') { document.title = 'R3 ACK from ' + e.origin; }
  });
  window.opener.postMessage({ type: 'r3-test', from: location.origin, curricula: location.hash, sentAt: Date.now() }, '*');
})();
