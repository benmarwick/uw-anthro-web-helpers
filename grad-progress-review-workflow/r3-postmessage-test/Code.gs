/* R3: does an Apps Script web app page receive postMessage from a tab it opened?
   See course-feedback-plan.md §4.5 and build-spec.md §5. This project uses no Google
   services, so it needs no OAuth scopes. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('R3 postMessage test');
}
