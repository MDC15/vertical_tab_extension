// ------------------- QUẢN LÝ DANH SÁCH TAB -------------------
function renderTabs(tabs) {
  const container = document.getElementById("tabsContainer");
  container.innerHTML = "";

  tabs.forEach(tab => {
    const tabDiv = document.createElement("div");
    tabDiv.className = "tab";

    // Favicon
    const favicon = document.createElement("img");
    favicon.src = tab.favIconUrl || "default_icon.png"; // fallback icon
    favicon.alt = "";
    tabDiv.appendChild(favicon);

    // Tiêu đề tab
    const title = document.createElement("div");
    title.className = "tab-title";
    title.textContent = tab.title;
    tabDiv.appendChild(title);

    // Khi click -> kích hoạt tab & đóng sidebar
    tabDiv.addEventListener("click", () => {
      chrome.tabs.update(tab.id, { active: true });
      window.close(); // thu gọn sidebar
    });

    container.appendChild(tabDiv);
  });
}

// Gọi hàm chrome.tabs.query để lấy danh sách tab của cửa sổ hiện tại
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  renderTabs(tabs);
});


// ------------------- TÙY CHỈNH THEME & BG -------------------
const themeSelect = document.getElementById("themeSelect");
const customColorPicker = document.getElementById("customColorPicker");
const bgUpload = document.getElementById("bgUpload");

/**
 * Áp dụng theme cho body (class .light, .dark, .pink, .custom).
 * Nếu theme = 'custom' -> sử dụng color picker
 */
function applyTheme(theme, customColor) {
  // Xóa hết theme cũ
  document.body.classList.remove("light", "dark", "pink");
  // Xóa style inline cũ
  document.body.style.removeProperty("--bg-color");
  document.body.style.removeProperty("--text-color");

  switch(theme) {
    case "light":
      document.body.classList.add("light");
      break;
    case "dark":
      document.body.classList.add("dark");
      break;
    case "pink":
      document.body.classList.add("pink");
      break;
    case "custom":
      // Thiết lập màu custom
      document.body.style.setProperty("--bg-color", customColor);
      // text-color => tạm tính ra cho “hợp lý”, 
      // hoặc để người dùng chọn thêm 1 color khác
      document.body.style.setProperty("--text-color", "#ffffff");
      break;
    default:
      document.body.classList.add("light");
  }
}

// Khi thay đổi themeSelect
themeSelect.addEventListener("change", () => {
  const selected = themeSelect.value;
  if (selected === "custom") {
    // Hiện color picker
    customColorPicker.style.display = "inline-block";
  } else {
    customColorPicker.style.display = "none";
    // Áp dụng ngay theme
    applyTheme(selected);
    saveTheme(selected, null);
  }
});

// Khi người dùng chọn màu ở color picker
customColorPicker.addEventListener("input", () => {
  const color = customColorPicker.value;
  applyTheme("custom", color);
  saveTheme("custom", color);
});

// BG Upload
bgUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const bgData = event.target.result;
      // Áp dụng background
      document.body.style.backgroundImage = `url('${bgData}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundRepeat = "no-repeat";
      // Lưu setting
      chrome.storage.local.set({ customBackground: bgData });
    };
    reader.readAsDataURL(file);
  }
});

// ------------------- LƯU & KHÔI PHỤC CÀI ĐẶT -------------------
function saveTheme(theme, color) {
  chrome.storage.local.set({ themeSetting: { theme, color }});
}

function loadTheme() {
  chrome.storage.local.get(["themeSetting", "customBackground"], (result) => {
    const ts = result.themeSetting;
    if (ts) {
      // Ví dụ: { theme: "custom", color: "#ff0000" }
      themeSelect.value = ts.theme;
      if (ts.theme === "custom") {
        customColorPicker.style.display = "inline-block";
        customColorPicker.value = ts.color || "#ffffff";
        applyTheme("custom", ts.color);
      } else {
        applyTheme(ts.theme);
      }
    } else {
      // default
      themeSelect.value = "light";
      applyTheme("light");
    }

    // Khôi phục background nếu có
    if (result.customBackground) {
      const bgData = result.customBackground;
      document.body.style.backgroundImage = `url('${bgData}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundRepeat = "no-repeat";
    }
  });
}

// Gọi khi load
loadTheme();
