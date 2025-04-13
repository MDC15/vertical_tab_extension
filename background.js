chrome.action.onClicked.addListener(() => {
  // Lấy thông tin màn hình để canh cửa sổ sidebar ở bên phải
  const screenWidth = screen.availWidth;
  const screenHeight = screen.availHeight;
  // Tỉ lệ chiếm 20% chiều ngang (bạn có thể thay 0.2 thành 0.15 tùy thích)
  const sidebarWidth = Math.round(screenWidth * 0.2);
  const sidebarLeft = screenWidth - sidebarWidth;

  chrome.windows.create({
    url: "sidebar.html",
    type: "popup",
    left: sidebarLeft,
    top: 0,
    width: sidebarWidth,
    height: screenHeight,
    focused: true
  });
});
