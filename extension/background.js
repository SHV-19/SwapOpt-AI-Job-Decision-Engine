async function configureSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  } catch (error) {
    console.error("Failed to configure Side Panel:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanel();
});