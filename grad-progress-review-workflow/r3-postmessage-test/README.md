# R3: postMessage Test

A minimal Apps Script web app that checks whether a page served by `HtmlService` can receive `postMessage` from a MyGrad tab and a Time Schedule tab it opened (course-feedback plan §4.5, task R3).

**Result, 17 November 2026: passed.** Both opened tabs kept their `window.opener` link; the app received a message from `https://webappssecure.grad.uw.edu` and from `https://www.washington.edu`, and its reply reached each tab. The `#curricula=…` URL fragment did not survive the Time Schedule's load, so the real app passes the curricula list by message.

**How to rerun:** `clasp push`, `clasp create-deployment`, open the deployment URL, click a button, and run `test-snippet.js` in the tab that opens (for example from the browser console). The test was run on an anonymous-access deployment, now deleted; `appsscript.json` is set back to UW-only access.
