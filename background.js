// background.js - Service Worker

// Mở Side Panel khi người dùng nhấp vào icon của extension
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Failed to set side panel behavior:", error));

// Lắng nghe cài đặt hoặc gỡ cài đặt
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`Vertical Tabs extension ${details.reason}.`);
  // Đặt giá trị theme mặc định nếu chưa có khi cài đặt lần đầu
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.sync.get(["theme"], (result) => {
      if (!result.theme) {
        chrome.storage.sync.set({ theme: "dark" }).then(() => {
          console.log("Default theme set to dark.");
        });
      }
    });
  }
});
