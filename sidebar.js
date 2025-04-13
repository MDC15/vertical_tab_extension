// DOM Elements
const tabList = document.getElementById("tab-list");
const themeSelect = document.getElementById("theme-select");
const customColorsPanel = document.getElementById("custom-colors");
const bgColorPicker = document.getElementById("bg-color-picker");
const textColorPicker = document.getElementById("text-color-picker");
const accentColorPicker = document.getElementById("accent-color-picker");
const bodyElement = document.body;

// Debounce timer variable
let updateTabTimeout;

// --- Initialization ---
async function initialize() {
  await loadAndApplySettings(); // Load settings first
  await loadTabs(); // Then load tabs
  setupEventListeners(); // Setup listeners last
}
initialize().catch(console.error); // Start initialization and log any top-level errors

// --- Tab Management Functions ---
async function loadTabs() {
  // console.log("Loading tabs..."); // Uncomment for debugging
  try {
    const [tabs, currentActiveTab] = await Promise.all([
      chrome.tabs.query({}),
      getCurrentActiveTab(),
    ]);

    tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index); // Sort more concisely

    const fragment = document.createDocumentFragment();
    if (tabs.length > 0) {
      tabs.forEach((tab) => {
        const tabItem = createTabElement(tab, tab.id === currentActiveTab?.id);
        fragment.appendChild(tabItem);
      });
      tabList.innerHTML = ""; // Clear only if there are new tabs
      tabList.appendChild(fragment);
    } else {
      tabList.innerHTML =
        '<li class="loading-placeholder">Không có tab nào đang mở.</li>';
    }
  } catch (error) {
    console.error("Error loading tabs:", error);
    // Display error in the UI
    tabList.innerHTML = `<li class="loading-placeholder">Lỗi: ${error.message}</li>`;
  }
}

async function getCurrentActiveTab() {
  try {
    let [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab) {
      [tab] = await chrome.tabs.query({ active: true });
    } // Fallback
    return tab;
  } catch (error) {
    console.warn("Could not get active tab:", error.message);
    return null;
  }
}
function createTabElement(tab, isActive) {
  const listItem = document.createElement("li");
  listItem.className = `tab-item ${isActive ? "active" : ""}`; // Set active class directly
  listItem.dataset.tabId = String(tab.id); // Ensure it's a string for querySelector
  listItem.dataset.windowId = String(tab.windowId);
  listItem.title = `${tab.title || "No Title"}\n${tab.url || ""}`; // Handle potentially missing URL

  // Favicon
  const favicon = document.createElement("img");
  favicon.className = "tab-favicon";
  favicon.alt = "";
  favicon.loading = "lazy"; // Lazy load favicons

  let faviconSrc = "icons/icon16.png"; // Default fallback

  // Check if Chrome provided a valid favIconUrl directly
  if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://theme/")) {
    faviconSrc = tab.favIconUrl;
  }
  // If no valid favIconUrl, try using the tab's URL, but only if it's likely a real webpage
  else if (
    tab.url &&
    (tab.url.startsWith("http:") || tab.url.startsWith("https:"))
  ) {
    // *** START: Thêm kiểm tra để loại trừ URL không phải trang web ***
    const urlString = tab.url.toLowerCase();
    const isLikelyNonWebpage =
      urlString === "https://www.w3.org/2000/svg" || // Loại trừ cụ thể URI này
      urlString.startsWith("data:") || // Loại trừ data URLs
      urlString.endsWith(".xml") || // Ví dụ: Loại trừ file XML trực tiếp
      urlString.endsWith(".svg"); // Ví dụ: Loại trừ file SVG trực tiếp
    // Thêm các kiểm tra khác nếu cần

    if (!isLikelyNonWebpage) {
      // Only attempt chrome://favicon/ for likely webpages
      try {
        new URL(tab.url); // Validate URL structure again just in case
        faviconSrc = `chrome://favicon/size/16@1x/${encodeURIComponent(
          tab.url
        )}`;
      } catch (e) {
        console.warn(`Invalid URL structure for favicon service: ${tab.url}`);
        // Keep default faviconSrc if URL is invalid
      }
    } else {
      console.log(
        `Skipping favicon service for likely non-webpage URL: ${tab.url}`
      );
      // Keep default faviconSrc for these special URLs
    }
    // *** END: Thêm kiểm tra ***
  }
  // Else (e.g., chrome:// URLs, file:// URLs, etc.), it keeps the default fallback 'icons/icon16.png'

  favicon.src = faviconSrc;

  // Final fallback error handler
  favicon.onerror = () => {
    if (favicon.src !== "icons/icon16.png") {
      console.log(`Failed to load favicon: ${favicon.src}, falling back.`);
      favicon.src = "icons/icon16.png";
    }
    favicon.onerror = null; // Prevent potential infinite loops
  };

  // Title
  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = tab.title || tab.url || "..."; // Show URL or placeholder

  // Close Button
  const closeButton = document.createElement("button");
  closeButton.className = "close-tab-btn";
  closeButton.title = "Đóng tab";
  closeButton.type = "button"; // Explicitly set type
  closeButton.innerHTML = `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M2.222 1.01l3.778 3.778L9.778 1.01 11 2.222 7.222 6l3.778 3.778L9.778 11 6 7.222 2.222 11 1 9.778 4.778 6 1 2.222z" fill-rule="evenodd"/></svg>`;
  closeButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      chrome.tabs.remove(tab.id).catch((error) => {
        console.warn(`Could not remove tab ${tab.id}: ${error.message}`);
        listItem.remove(); // Remove from UI even if API fails
        if (tabList.children.length === 0) {
          tabList.innerHTML =
            '<li class="loading-placeholder">Không có tab nào đang mở.</li>';
        }
      });
    },
    { passive: true }
  );

  listItem.appendChild(favicon);
  listItem.appendChild(title);
  listItem.appendChild(closeButton);

  // Tab Activation Listener
  listItem.addEventListener("click", async () => {
    if (listItem.classList.contains("active")) return;
    try {
      await chrome.windows.update(parseInt(listItem.dataset.windowId, 10), {
        focused: true,
      }); // Ensure ID is integer
      await chrome.tabs.update(parseInt(listItem.dataset.tabId, 10), {
        active: true,
      }); // Ensure ID is integer
    } catch (error) {
      console.warn(
        `Failed to activate tab ${listItem.dataset.tabId}: ${error.message}`
      );
      // Attempt to refresh the list if activation fails (e.g., tab/window closed)
      const updateDebounced = () => {
        clearTimeout(updateTabTimeout);
        updateTabTimeout = setTimeout(loadTabs, 150);
      };
      updateDebounced();
    }
  });

  return listItem;
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  const updateDebounced = () => {
    clearTimeout(updateTabTimeout);
    updateTabTimeout = setTimeout(loadTabs, 150);
  };

  chrome.tabs.onCreated.addListener(updateDebounced);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
      changeInfo.url ||
      changeInfo.title ||
      changeInfo.favIconUrl ||
      changeInfo.status
    ) {
      updateDebounced();
    }
  });
  chrome.tabs.onMoved.addListener(updateDebounced);
  chrome.tabs.onActivated.addListener(updateDebounced); // Handles switching active tab
  chrome.tabs.onAttached.addListener(updateDebounced);
  chrome.tabs.onDetached.addListener(updateDebounced);
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Direct DOM removal is faster
    const itemToRemove = tabList.querySelector(`li[data-tab-id='${tabId}']`);
    if (itemToRemove) {
      itemToRemove.remove();
      if (tabList.children.length === 0) {
        tabList.innerHTML =
          '<li class="loading-placeholder">Không có tab nào đang mở.</li>';
      }
    } else {
      updateDebounced();
    } // Fallback if not found
  });

  // Settings Events
  themeSelect.addEventListener("change", handleThemeChange);
  bgColorPicker.addEventListener("input", handleColorChange); // 'input' for live preview
  textColorPicker.addEventListener("input", handleColorChange);
  accentColorPicker.addEventListener("input", handleColorChange);
}

// --- Theme and Settings Management ---
function applyTheme(theme, customColors = {}) {
  bodyElement.className = ""; // Clear all existing classes first
  customColorsPanel.style.display = "none";

  const defaultCustom = { bg: "#333344", text: "#eeeeff", accent: "#88aaff" };

  if (theme === "light") {
    bodyElement.classList.add("light-theme");
  } else if (theme === "custom") {
    bodyElement.classList.add("custom-theme");
    customColorsPanel.style.display = "inline-flex"; // Use flex for alignment

    const bg = customColors.bg || defaultCustom.bg;
    const text = customColors.text || defaultCustom.text;
    const accent = customColors.accent || defaultCustom.accent;

    // Update picker values
    bgColorPicker.value = bg;
    textColorPicker.value = text;
    accentColorPicker.value = accent;

    // Apply custom colors via CSS variables
    bodyElement.style.setProperty("--custom-bg-color", bg);
    bodyElement.style.setProperty("--custom-text-color", text);
    bodyElement.style.setProperty("--custom-accent-color", accent);
  } else {
    // Default to dark
    bodyElement.classList.add("dark-theme");
    if (theme !== "dark") theme = "dark"; // Correct invalid theme value
  }

  if (themeSelect.value !== theme) {
    themeSelect.value = theme;
  }
}

function saveSettings(settings) {
  chrome.storage.sync
    .set(settings)
    .then(() => {
      // console.log("Settings saved:", settings); // Uncomment for debugging
    })
    .catch((error) => {
      console.error("Error saving settings:", error);
    });
}

async function loadAndApplySettings() {
  try {
    const result = await chrome.storage.sync.get([
      "theme",
      "customBgColor",
      "customTextColor",
      "customAccentColor",
    ]);
    const theme = result.theme || "dark";
    const customColors = {
      bg: result.customBgColor,
      text: result.customTextColor,
      accent: result.customAccentColor,
    };

    // Apply theme and potentially update pickers
    applyTheme(theme, customColors);
    // console.log("Settings loaded and applied:", { theme, customColors }); // Uncomment for debugging
  } catch (error) {
    console.error("Error loading settings:", error);
    applyTheme("dark"); // Fallback to dark on error
  }
}

// --- Event Handlers ---
function handleThemeChange() {
  const selectedTheme = themeSelect.value;
  const settings = { theme: selectedTheme };
  const currentCustomColors = {
    bg: bgColorPicker.value,
    text: textColorPicker.value,
    accent: accentColorPicker.value,
  };

  if (selectedTheme === "custom") {
    settings.customBgColor = currentCustomColors.bg;
    settings.customTextColor = currentCustomColors.text;
    settings.customAccentColor = currentCustomColors.accent;
  }

  // Pass current picker colors to applyTheme when switching TO custom
  applyTheme(
    selectedTheme,
    selectedTheme === "custom" ? currentCustomColors : {}
  );
  saveSettings(settings);
}

function handleColorChange() {
  if (themeSelect.value === "custom") {
    const customBg = bgColorPicker.value;
    const customText = textColorPicker.value;
    const customAccent = accentColorPicker.value;

    // Apply visual changes via CSS vars
    bodyElement.style.setProperty("--custom-bg-color", customBg);
    bodyElement.style.setProperty("--custom-text-color", customText);
    bodyElement.style.setProperty("--custom-accent-color", customAccent);

    // Save the updated custom colors (could add debounce here too)
    saveSettings({
      theme: "custom",
      customBgColor: customBg,
      customTextColor: customText,
      customAccentColor: customAccent,
    });
  }
}

// Helper function for debounce (optional, but good practice for saving)
// function debounce(func, wait) {
//   let timeout;
//   return function executedFunction(...args) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// };
// Example usage: const debouncedSave = debounce(saveSettings, 500);
// Then call debouncedSave(...) instead of saveSettings directly in handleColorChange
