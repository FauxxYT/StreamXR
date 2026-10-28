// StreamXR's background script (manifest.json "background"): opens StreamXR Home once, right
// after StreamXR is installed, with its first-run welcome (home.html?welcome=1;
// docs/Home-Page.md). Not on updates or reloads. Opening a tab needs no permission.
'use strict';

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason !== 'install') return;
  chrome.tabs.create({ url: chrome.runtime.getURL('src/streamxr/home/home.html?welcome=1') });
});
