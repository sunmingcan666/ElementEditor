// 后台脚本，管理扩展状态
let isActive = false;

// 点击扩展图标时切换激活状态
browser.action.onClicked.addListener((tab) => {
  isActive = !isActive;
  
  browser.tabs.sendMessage(tab.id, {
    action: isActive ? "activate" : "deactivate"
  });
});

// 处理标签页更新
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isActive) {
    browser.tabs.sendMessage(tabId, {
      action: "activate"
    });
  }
});