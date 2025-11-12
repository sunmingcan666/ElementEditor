// 内容脚本 - 注入到网页中
(function() {
  'use strict';
  
  // 全局变量
  let isExtensionActive = false;
  let isSelecting = false;
  let selectedElement = null;
  let highlighter = null;
  let panel = null;
  let boxModelOverlay = null;
  let positionAdjustmentInterval = null;
  let responsiveViewport = null;
  let floatingBall = null;
  let closeButton = null;
  let isDragging = false;
  let isMouseDown = false;
  let dragElement = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let elementStartLeft = 0;
  let elementStartTop = 0;
  
  // 初始化
  function init() {
    createFloatingBall();
    createHighlighter();
    createBoxModelOverlay();
    setupEventListeners();
    injectAnimationStyles();
    isExtensionActive = true;
  }
  
  // 注入动画样式
  function injectAnimationStyles() {
    const styleId = 'element-editor-animations';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        @keyframes editor-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes editor-slide {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes editor-bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0,-30px,0);
          }
          70% {
            transform: translate3d(0,-15px,0);
          }
          90% {
            transform: translate3d(0,-4px,0);
          }
        }
        
        @keyframes editor-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes editor-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes editor-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        
        .editor-animation-fade {
          animation: editor-fade 1s ease-in-out;
        }
        
        .editor-animation-slide {
          animation: editor-slide 0.5s ease-out;
        }
        
        .editor-animation-bounce {
          animation: editor-bounce 1s ease-in-out;
        }
        
        .editor-animation-rotate {
          animation: editor-rotate 1s linear infinite;
        }
        
        .editor-animation-pulse {
          animation: editor-pulse 0.5s ease-in-out infinite;
        }
        
        .editor-animation-shake {
          animation: editor-shake 0.5s ease-in-out;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }
  
  // 创建悬浮球
  function createFloatingBall() {
    if (floatingBall) return;
    
    floatingBall = document.createElement('div');
    floatingBall.id = 'web-element-editor-ball';
    floatingBall.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 50px;
      height: 50px;
      background: #80c6ff;
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(128, 198, 255, 0.4);
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      user-select: none;
    `;
    
    // 添加悬浮球图标
    const icon = document.createElement('span');
    icon.innerHTML = '✏️';
    icon.style.cssText = `
      font-size: 24px;
    `;
    
    floatingBall.appendChild(icon);
    
    // 添加动画效果
    floatingBall.addEventListener('mouseenter', () => {
      floatingBall.style.transform = 'scale(1.1)';
      floatingBall.style.background = '#4dabf7';
      floatingBall.style.boxShadow = '0 4px 20px rgba(77, 171, 247, 0.4)';

    });
    
    floatingBall.addEventListener('mouseleave', () => {
      floatingBall.style.transform = 'scale(1)';
      floatingBall.style.background = '#80c6ff';
      floatingBall.style.boxShadow = '0 4px 20px rgba(128, 198, 255, 0.4)';

    });
    
    // 点击悬浮球显示面板
    floatingBall.addEventListener('click', (e) => {
      // 只有在非拖拽状态下才显示面板
      const dragState = makeFloatingBallDraggable.hasDragged || makeFloatingBallDraggable.isDragging;
      if (!dragState) {
        showPanel();
      }
      // 重置拖拽状态标记
      makeFloatingBallDraggable.hasDragged = false;
    });
    
    // 右键悬浮球显示关闭按钮
    floatingBall.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // 阻止默认右键菜单
      showCloseButton();
    });
    
    document.body.appendChild(floatingBall);
    
    // 使悬浮球可拖动
    makeFloatingBallDraggable();
  }
  
  // 使悬浮球可拖动
  function makeFloatingBallDraggable() {
    // 定义为函数属性，使其在外部可访问
    makeFloatingBallDraggable.isDragging = false;
    makeFloatingBallDraggable.hasDragged = false;
    
    let startX, startY; // 记录鼠标按下时的位置
    let offsetX, offsetY; // 鼠标相对于悬浮球的偏移量
    let originalCursor;
    let dragThreshold = 5; // 拖拽阈值，超过这个距离才视为拖拽
    let animationFrameId; // 用于requestAnimationFrame
    
    floatingBall.addEventListener('mousedown', (e) => {
      // 只有左键可拖动
      if (e.button !== 0) return;
      
      // 记录初始位置
      startX = e.clientX;
      startY = e.clientY;
      
      // 计算鼠标相对于悬浮球的偏移量
      const rect = floatingBall.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      makeFloatingBallDraggable.isDragging = true;
      makeFloatingBallDraggable.hasDragged = false;
      originalCursor = floatingBall.style.cursor;
      floatingBall.style.cursor = 'grabbing';
      
      // 禁用动画过渡，避免拖拽时的卡顿
      floatingBall.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!makeFloatingBallDraggable.isDragging) return;
      
      // 检查是否超过拖拽阈值
      if (!makeFloatingBallDraggable.hasDragged) {
        const diffX = Math.abs(e.clientX - startX);
        const diffY = Math.abs(e.clientY - startY);
        if (diffX < dragThreshold && diffY < dragThreshold) {
          return; // 未超过阈值，不视为拖拽
        }
        makeFloatingBallDraggable.hasDragged = true;
      }
      
      // 使用requestAnimationFrame优化性能
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        // 计算新位置
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        
        // 设置新位置（确保不会超出视口）
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const ballWidth = floatingBall.offsetWidth;
        const ballHeight = floatingBall.offsetHeight;
        
        // 限制在视口内
        const boundedLeft = Math.max(0, Math.min(newLeft, viewportWidth - ballWidth));
        const boundedTop = Math.max(0, Math.min(newTop, viewportHeight - ballHeight));
        
        floatingBall.style.left = `${boundedLeft}px`;
        floatingBall.style.top = `${boundedTop}px`;
        // 移除bottom和right属性，使用left和top控制位置
        floatingBall.style.bottom = 'auto';
        floatingBall.style.right = 'auto';
      });
    });
    
    document.addEventListener('mouseup', () => {
      if (makeFloatingBallDraggable.isDragging) {
        makeFloatingBallDraggable.isDragging = false;
        floatingBall.style.cursor = originalCursor;
        
        // 恢复动画过渡
        setTimeout(() => {
          floatingBall.style.transition = 'all 0.3s ease';
        }, 0);
        
        // 取消动画帧
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    });
    
    // 阻止拖拽时选择文本
    floatingBall.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
    
    // 阻止默认选择行为
    floatingBall.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
  }
  
  // 创建关闭按钮
  function createCloseButton() {
    if (closeButton) return;
    
    closeButton = document.createElement('div');
    closeButton.id = 'web-element-editor-close-btn';
    closeButton.style.cssText = `
      position: fixed;
      width: 30px;
      height: 30px;
      background: red;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10001;
      font-size: 20px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      opacity: 0;
      transform: scale(0.5);
      pointer-events: none;
    `;
    
    closeButton.textContent = '×';
    
    // 关闭按钮点击事件
    closeButton.addEventListener('click', () => {
      if (floatingBall && floatingBall.parentNode) {
        floatingBall.parentNode.removeChild(floatingBall);
        floatingBall = null;
      }
      if (closeButton && closeButton.parentNode) {
        closeButton.parentNode.removeChild(closeButton);
        closeButton = null;
      }
    });
    
    // 鼠标移出关闭按钮时隐藏
    closeButton.addEventListener('mouseleave', () => {
      hideCloseButton();
    });
    
    document.body.appendChild(closeButton);
  }
  
  // 显示关闭按钮
  function showCloseButton() {
    if (!floatingBall) return;
    
    createCloseButton();
    
    // 计算关闭按钮位置（悬浮球的右上方）
    const ballRect = floatingBall.getBoundingClientRect();
    closeButton.style.top = (ballRect.top - 15) + 'px';
    closeButton.style.left = (ballRect.right - 15) + 'px';
    
    // 显示关闭按钮
    closeButton.style.opacity = '1';
    closeButton.style.transform = 'scale(1)';
    closeButton.style.pointerEvents = 'auto';
  }
  
  // 隐藏关闭按钮
  function hideCloseButton() {
    if (!closeButton) return;
    
    closeButton.style.opacity = '0';
    closeButton.style.transform = 'scale(0.5)';
    closeButton.style.pointerEvents = 'none';
    
    // 延迟移除，等待动画完成
    setTimeout(() => {
      if (closeButton && closeButton.parentNode && closeButton.style.opacity === '0') {
        closeButton.parentNode.removeChild(closeButton);
        closeButton = null;
      }
    }, 300);
  }
  
  // 显示面板
  function showPanel() {
    if (!panel) {
      createPanel();
    }
    
    // 隐藏悬浮球
    if (floatingBall) {
      floatingBall.style.display = 'none';
    }
    
    // 显示面板
    if (panel) {
      panel.style.display = 'block';
      
      // 显示选择元素和清除选择按钮部分（现在是第一个section）
      const selectSection = panel.querySelector('.section:first-child');
      if (selectSection) {
        selectSection.classList.remove('hidden');
      }
      
      // 显示搜索元素部分（现在是第二个section）
      const searchSection = panel.querySelectorAll('.section')[1];
      if (searchSection) {
        searchSection.classList.remove('hidden');
      }
      
      // 如果有选中元素，显示相应的编辑面板
      if (selectedElement) {
        showEditorPanels();
      }
    }
  }
  
  // 隐藏面板并显示悬浮球
  function hidePanel() {
    // 隐藏面板
    if (panel) {
      panel.style.display = 'none';
    }
    
    // 显示悬浮球
    if (floatingBall) {
      floatingBall.style.display = 'flex';
    }
  }
  
  // 创建悬浮窗
  function createPanel() {
    if (panel) return;
    
    panel = document.createElement('div');
    panel.id = 'web-element-editor-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      background: #ffffff;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      max-height: 90vh;
    `;
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">ElementEditor v1.1.1</span>
        <div class="panel-controls">
          <button id="minimize-btn" class="primary-btn control-btn">−</button>
      <button id="close-btn" class="primary-btn control-btn">×</button>
        </div>
      </div>
      <div class="panel-content">
        
        <div class="section">
          <button id="select-element-btn" class="primary-btn">选择元素</button>
          <button id="clear-selection-btn" class="primary-btn" style="background-color: red; color: white;">清除选择</button>
          <button id="drag-element-btn" class="primary-btn" style="display: none;">开始拖拽</button>
          <button id="copy-source-code-btn" class="primary-btn">复制网页代码</button>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">点击ESC取消选择</div>
        </div>
        
        <!-- 元素搜索功能 -->
        <div class="section">
          <h4>搜索元素</h4>
          <div class="search-container" style="display: flex; gap: 8px; margin-bottom: 10px; position: relative;">
            <input type="text" id="element-search-input" placeholder="搜索标签、ID、类名或内容..." style="flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; color: #000;">
            <button id="search-element-btn" class="primary-btn secondary-btn" style="position: relative;">搜索</button>
            <div id="search-loading" style="position: absolute; right: 70px; top: 50%; transform: translateY(-50%); display: none;">
              <span class="loading-spinner" style="display: inline-block; width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #0078d4; border-radius: 50%; animation: editor-rotate 1s linear infinite;"></span>
            </div>
          </div>
          <div id="search-results" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; display: none;"></div>
        </div>
        
        <div id="element-info" class="section hidden">
          <h3>元素信息</h3>
          <div class="info-row">
            <label>标签:</label>
            <span id="element-tag"></span>
          </div>
          <div class="info-row">
            <label>ID:</label>
            <span id="element-id"></span>
          </div>
          <div class="info-row">
            <label>类名:</label>
            <span id="element-class"></span>
          </div>
          <div class="info-row">
            <label>尺寸:</label>
            <span id="element-size"></span>
          </div>
          <div class="info-row">
            <label>位置:</label>
            <span id="element-position"></span>
          </div>
        </div>
        
        <!-- 将删除按钮移到更显眼的位置 -->
        <div class="section hidden" id="element-actions">
          <button id="remove-element-btn" class="primary-btn danger-btn">删除元素</button>
          <button id="copy-element-code-btn" class="primary-btn">复制代码</button>
          <button id="clone-element-btn" class="primary-btn">克隆元素</button>
          <button id="insert-into-div-btn" class="primary-btn">插入到...</button>
        </div>
        
        <div id="element-editor" class="section hidden">
          <h3>元素编辑</h3>
          <div id="text-editor" class="editor-section">
            <label>文本内容:</label>
            <textarea id="element-text" rows="3"></textarea>
            <button id="apply-text-btn" class="primary-btn action-btn">应用文本</button>
          </div>
          
          <div id="style-editor" class="editor-section">
            <label>样式编辑:</label>
            <div class="style-controls">
              <div class="style-row">
                <label>字体大小:</label>
                <input type="text" id="font-size-input" placeholder="例如: 16px">
              </div>
              <div class="style-row">
                <label>字体颜色:</label>
                <input type="color" id="font-color-input">
              </div>
              <div class="style-row">
                <label>背景颜色:</label>
                <input type="color" id="bg-color-input">
              </div>
              <div class="style-row">
                <label>字体:</label>
                <select id="font-family-select">
                  <option value="">默认</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                </select>
              </div>
              <div class="style-row">
                <label>文本对齐:</label>
                <select id="text-align-select">
                  <option value="">默认</option>
                  <option value="left">左对齐</option>
                  <option value="center">居中</option>
                  <option value="right">右对齐</option>
                  <option value="justify">两端对齐</option>
                </select>
              </div>
              <div class="style-row">
                <label>边框:</label>
                <input type="text" id="border-input" placeholder="例如: 1px solid #000">
              </div>
              <div class="style-row">
                <label>内边距:</label>
                <input type="text" id="padding-input" placeholder="例如: 10px">
              </div>
              <div class="style-row">
                <label>外边距:</label>
                <input type="text" id="margin-input" placeholder="例如: 10px">
              </div>
            </div>
            <button id="apply-style-btn" class="primary-btn action-btn">应用样式</button>
          </div>
          
          <div id="attribute-editor" class="editor-section">
            <label>属性编辑:</label>
            <div class="attribute-controls">
              <div class="attribute-row">
                <label>ID:</label>
                <input type="text" id="element-id-input">
              </div>
              <div class="attribute-row">
                <label>类名:</label>
                <input type="text" id="element-class-input">
              </div>
              <div class="attribute-row">
                <label>标题:</label>
                <input type="text" id="element-title-input">
              </div>
              <div class="attribute-row">
                <label>链接地址:</label>
                <input type="text" id="element-href-input">
              </div>
            </div>
            <button id="apply-attributes-btn" class="primary-btn action-btn">应用属性</button>
          </div>
          
          <div id="image-editor" class="editor-section hidden">
            <label>图片编辑:</label>
            <div class="image-controls">
              <div class="image-row">
                <label>图片URL:</label>
                <input type="text" id="image-src-input">
              </div>
              <div class="image-row">
                <label>替代文本:</label>
                <input type="text" id="image-alt-input">
              </div>
              <div class="image-row">
                <label>宽度:</label>
                <input type="text" id="image-width-input" placeholder="例如: 100px 或 50%">
              </div>
              <div class="image-row">
                <label>高度:</label>
                <input type="text" id="image-height-input" placeholder="例如: 100px 或 50%">
              </div>
            </div>
            <button id="apply-image-btn" class="primary-btn action-btn">应用图片设置</button>
          </div>
        </div>
        
        <!-- 新增功能：位置微调 -->
        <div id="position-editor" class="section hidden">
          <h3>位置微调</h3>
          <div class="position-controls">
            <div class="position-row">
              <label>位置:</label>
              <select id="position-select">
                <option value="static">静态(static)</option>
                <option value="relative">相对(relative)</option>
                <option value="absolute">绝对(absolute)</option>
                <option value="fixed">固定(fixed)</option>
                <option value="sticky">粘性(sticky)</option>
              </select>
            </div>
            <div class="position-row">
              <label>微调距离:</label>
              <input type="number" id="adjustment-distance" value="1" min="1" max="100">
              <span>px</span>
            </div>
            <div class="position-buttons">
              <div class="position-button-row">
                <button id="move-up-btn" class="primary-btn direction-btn" data-direction="up">↑</button>
              </div>
              <div class="position-button-row">
                <button id="move-left-btn" class="primary-btn direction-btn" data-direction="left">←</button>
              <button id="move-center-btn" class="primary-btn direction-btn" data-direction="center">中心</button>
              <button id="move-right-btn" class="primary-btn direction-btn" data-direction="right">→</button>
              </div>
              <div class="position-button-row">
                <button id="move-down-btn" class="primary-btn direction-btn" data-direction="down">↓</button>
              </div>
            </div>
            <div class="position-values">
              <div class="position-value-row">
                <label>上:</label>
                <input type="text" id="top-input" placeholder="例如: 10px">
              </div>
              <div class="position-value-row">
                <label>右:</label>
                <input type="text" id="right-input" placeholder="例如: 10px">
              </div>
              <div class="position-value-row">
                <label>下:</label>
                <input type="text" id="bottom-input" placeholder="例如: 10px">
              </div>
              <div class="position-value-row">
                <label>左:</label>
                <input type="text" id="left-input" placeholder="例如: 10px">
              </div>
              <button id="apply-position-btn" class="primary-btn action-btn">应用位置</button>
            </div>
          </div>
        </div>
        
        <!-- 新增功能：盒模型可视化 -->
        <div id="box-model-editor" class="section hidden">
          <h3>盒模型可视化</h3>
          <div class="box-model-controls">
            <div class="box-model-values">
              <div class="box-model-row">
                <label>Margin:</label>
                <input type="text" id="box-margin-input" placeholder="例如: 10px">
              </div>
              <div class="box-model-row">
                <label>Border:</label>
                <input type="text" id="box-border-input" placeholder="例如: 1px solid #000">
              </div>
              <div class="box-model-row">
                <label>Padding:</label>
                <input type="text" id="box-padding-input" placeholder="例如: 10px">
              </div>
              <div class="box-model-row">
                <label>Width:</label>
                <input type="text" id="box-width-input" placeholder="例如: 100px">
              </div>
              <div class="box-model-row">
                <label>Height:</label>
                <input type="text" id="box-height-input" placeholder="例如: 100px">
              </div>
            </div>
            <button id="apply-box-model-btn" class="primary-btn action-btn">应用盒模型</button>
          </div>
        </div>
        
        <!-- 新增功能：响应式设计工具 -->
        <div id="responsive-editor" class="section hidden">
          <h3>响应式设计工具</h3>
          <div class="responsive-controls">
            <div class="viewport-tip" style="font-size: 12px; color: #666; margin-bottom: 8px;">
              提示：打开视口后可按ESC键关闭
            </div>
            <div class="responsive-presets">
              <label>预设设备:</label>
              <select id="device-preset">
                <option value="custom">自定义</option>
                <option value="mobile">手机 (375x667)</option>
                <option value="tablet">平板 (768x1024)</option>
                <option value="laptop">笔记本 (1366x768)</option>
                <option value="desktop">桌面 (1920x1080)</option>
              </select>
            </div>
            <div class="responsive-dimensions">
              <div class="dimension-row">
                <label>宽度:</label>
                <input type="number" id="viewport-width" value="1920" min="320" max="5000">
                <span>px</span>
              </div>
              <div class="dimension-row">
                <label>高度:</label>
                <input type="number" id="viewport-height" value="1080" min="480" max="5000">
                <span>px</span>
              </div>
            </div>
            <div class="responsive-actions">
              <button id="apply-viewport-btn" class="primary-btn action-btn">应用视口</button>
          <button id="reset-viewport-btn" class="primary-btn secondary-btn">重置视口</button>
            </div>
          </div>
        </div>
        
        <!-- 新增功能：动画编辑器 -->
        <div id="animation-editor" class="section hidden">
          <h3>动画编辑器</h3>
          <div class="animation-controls">
            <div class="animation-row">
              <label>过渡属性:</label>
              <input type="text" id="transition-property" placeholder="例如: all, opacity, transform">
            </div>
            <div class="animation-row">
              <label>过渡时长:</label>
              <input type="text" id="transition-duration" placeholder="例如: 0.3s">
            </div>
            <div class="animation-row">
              <label>过渡函数:</label>
              <select id="transition-timing">
                <option value="ease">ease</option>
                <option value="linear">linear</option>
                <option value="ease-in">ease-in</option>
                <option value="ease-out">ease-out</option>
                <option value="ease-in-out">ease-in-out</option>
                <option value="cubic-bezier(0.68, -0.55, 0.27, 1.55)">弹跳</option>
              </select>
            </div>
            <div class="animation-row">
              <label>动画类型:</label>
              <select id="animation-name">
                <option value="">无动画</option>
                <option value="fade">淡入淡出</option>
                <option value="slide">滑动</option>
                <option value="bounce">弹跳</option>
                <option value="rotate">旋转</option>
                <option value="pulse">脉动</option>
                <option value="shake">抖动</option>
              </select>
            </div>
            <div class="animation-row">
              <label>动画时长:</label>
              <input type="text" id="animation-duration" value="1s" placeholder="例如: 1s">
            </div>
            <div class="animation-actions">
              <button id="apply-animation-btn" class="primary-btn action-btn">应用动画</button>
          <button id="preview-animation-btn" class="primary-btn secondary-btn">预览动画</button>
          <button id="remove-animation-btn" class="primary-btn danger-btn">移除动画</button>
            </div>
          </div>
        </div>
        
        <div id="code-editor" class="section hidden">
          <h3>代码编辑</h3>
          <textarea id="element-html" rows="10" style="width: 100%; height: 200px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; resize: vertical;"></textarea>
          <button id="apply-html-btn" class="primary-btn action-btn">应用代码</button>
        </div>
        

      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 添加面板事件监听器
    setupPanelEventListeners();
  }
  
  // 创建高亮层
  function createHighlighter() {
    if (highlighter) return;
    
    highlighter = document.createElement('div');
    highlighter.id = 'web-element-highlighter';
    highlighter.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      border: 2px dashed #ff0000;
      background-color: rgba(255, 0, 0, 0.1);
      display: none;
    `;
    
    document.body.appendChild(highlighter);
  }
  
  // 显示通知
  function showNotification(message) {
    // 检查是否已存在通知元素
    let notification = document.getElementById('editor-notification');
    
    // 如果不存在，创建新的通知元素
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'editor-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 99999;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: opacity 0.3s, transform 0.3s;
      `;
      document.body.appendChild(notification);
    }
    
    // 设置消息内容
    notification.textContent = message;
    
    // 显示通知
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      // 动画结束后完全移除元素
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  // 创建盒模型可视化层
  function createBoxModelOverlay() {
    if (boxModelOverlay) return;
    
    boxModelOverlay = document.createElement('div');
    boxModelOverlay.id = 'box-model-overlay';
    boxModelOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      display: none;
    `;
    
    document.body.appendChild(boxModelOverlay);
  }
  
  // 创建插入目标选择模态窗口
  function createInsertTargetModal() {
    // 移除已存在的模态窗口
    const existingModal = document.getElementById('insert-target-modal-overlay');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // 创建模态窗口覆盖层
    const overlay = document.createElement('div');
    overlay.id = 'insert-target-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    `;
    
    // 创建模态窗口容器
    const modal = document.createElement('div');
    modal.id = 'insert-target-modal';
    modal.style.cssText = `
      background-color: white;
      border-radius: 8px;
      width: 80%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    // 创建模态窗口头部
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = `
      padding: 15px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f5f5f5;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '选择插入目标';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #333;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background-color: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    `;
    
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.backgroundColor = '#ddd';
    });
    
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.backgroundColor = 'transparent';
    });
    
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // 创建搜索框
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      padding: 15px;
      border-bottom: 1px solid #eee;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.id = 'target-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = '搜索div元素...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #000000;
      background-color: #ffffff;
      transition: all 0.2s ease;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
    `;
    
    // 添加focus状态样式
    searchInput.addEventListener('focus', function() {
      this.style.outline = 'none';
      this.style.borderColor = '#3b82f6';
      this.style.backgroundColor = '#ffffff';
      this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.05)';
      this.style.transform = 'translateY(-1px)';
      this.style.color = '#000000';
    });
    
    searchInput.addEventListener('blur', function() {
      this.style.borderColor = '#e2e8f0';
      this.style.backgroundColor = '#ffffff';
      this.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)';
      this.style.transform = 'translateY(0)';
    });
    
    searchInput.addEventListener('mouseover', function() {
      if (!this.matches(':focus')) {
        this.style.borderColor = '#cbd5e1';
        this.style.backgroundColor = '#f8fafc';
      }
    });
    
    searchInput.addEventListener('mouseout', function() {
      if (!this.matches(':focus')) {
        this.style.borderColor = '#e2e8f0';
        this.style.backgroundColor = '#ffffff';
      }
    });
    
    searchContainer.appendChild(searchInput);
    
    // 创建目标列表容器
    const listContainer = document.createElement('div');
    listContainer.id = 'target-list-container';
    listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 15px;
    `;
    
    // 获取页面上所有的div元素
    const divElements = document.querySelectorAll('div');
    
    // 去重处理
    const uniqueDivs = [];
    const seenElementSignatures = new Set();
    
    divElements.forEach(div => {
      // 跳过编辑器自身的元素
      if (div.closest('#web-element-editor-panel') || 
          div.id === 'insert-target-modal-overlay' || 
          div.id === 'element-actions' ||
          // 跳过选中的元素本身
          div === selectedElement) {
        return;
      }
      
      // 创建元素签名用于去重（基于id、class和内容特征）
      let signature;
      if (div.id) {
        // 有id的元素直接通过id去重
        signature = div.id;
      } else {
        // 没有id的元素通过class和内容特征去重
        const className = div.className || 'no-class';
        const contentHash = div.textContent.trim().substring(0, 50).replace(/\s+/g, ' ');
        const childCount = div.children.length;
        signature = `${className}-${contentHash}-${childCount}`;
      }
      
      if (!seenElementSignatures.has(signature)) {
        seenElementSignatures.add(signature);
        uniqueDivs.push(div);
      }
    });
    
    // 如果没有唯一的div元素
    if (uniqueDivs.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '页面上没有找到可插入的div元素';
      emptyMessage.style.cssText = `
        text-align: center;
        color: #666;
        margin: 20px 0;
      `;
      listContainer.appendChild(emptyMessage);
    } else {
      // 创建div元素列表
      const targetList = document.createElement('div');
      targetList.id = 'target-list';
      targetList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;
      
      // 为每个唯一的div元素创建一个选项
      uniqueDivs.forEach((div, index) => {
        const option = document.createElement('div');
        option.className = 'target-option';
        option.dataset.index = index;
        option.style.cssText = `
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: white;
        `;
        
        // 获取div的id和class信息
        const idInfo = div.id ? `ID: ${div.id}` : '无ID';
        const classInfo = div.className ? `类: ${div.className}` : '无类';
        const tagInfo = `DIV #${index + 1}`;
        
        // 创建信息元素
        const tagEl = document.createElement('div');
        tagEl.style.cssText = `
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        `;
        tagEl.textContent = tagInfo;
        
        const infoEl = document.createElement('div');
        infoEl.style.cssText = `
          font-size: 13px;
          color: #666;
        `;
        infoEl.textContent = `${idInfo} | ${classInfo}`;
        
        // 创建预览内容
        const previewEl = document.createElement('div');
        previewEl.style.cssText = `
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        `;
        
        // 显示div的前30个字符内容作为预览
        let previewText = div.textContent.trim();
        if (previewText.length > 30) {
          previewText = previewText.substring(0, 30) + '...';
        }
        previewEl.textContent = previewText || '(空内容)';
        
        option.appendChild(tagEl);
        option.appendChild(infoEl);
        option.appendChild(previewEl);
        
        // 存储对div元素的引用
        option._targetElement = div;
        
        // 添加鼠标悬停效果
        option.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f8fafc';
          this.style.borderColor = '#3b82f6';
          
          // 在页面上高亮显示对应的div
          highlightElement(this._targetElement);
        });
        
        option.addEventListener('mouseout', function() {
          this.style.backgroundColor = 'white';
          this.style.borderColor = '#e2e8f0';
          
          // 移除高亮
          removeHighlight();
        });
        
        // 添加点击事件
        option.addEventListener('click', function() {
          // 移除高亮
          removeHighlight();
          
          // 插入元素到选择的div中
          insertElementIntoDiv(this._targetElement);
          
          // 关闭模态窗口
          document.body.removeChild(overlay);
        });
        
        targetList.appendChild(option);
      });
      
      listContainer.appendChild(targetList);
      
      // 搜索功能
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const options = targetList.querySelectorAll('.target-option');
        
        options.forEach(option => {
          const text = option.textContent.toLowerCase();
          if (text.includes(searchTerm)) {
            option.style.display = 'block';
          } else {
            option.style.display = 'none';
          }
        });
      });
    }
    
    // 创建按钮区域
    const buttonArea = document.createElement('div');
    buttonArea.style.cssText = `
      padding: 15px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-start;
      gap: 10px;
    `;
    
    // 添加框选按钮
    const selectDirectBtn = document.createElement('button');
    selectDirectBtn.textContent = '框选div元素（ESC取消）';
    selectDirectBtn.className = 'primary-btn';
    selectDirectBtn.style.cssText = 'margin-right: auto;';
    selectDirectBtn.addEventListener('click', (e) => {
      // 阻止事件冒泡，防止被后续添加的全局点击事件监听器捕获
      e.stopPropagation();
      
      // 隐藏模态窗口
      overlay.style.display = 'none';
      
      // 开始框选模式
      startBoxSelection();
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'secondary-btn';
    cancelBtn.addEventListener('click', () => {
      removeHighlight();
      document.body.removeChild(overlay);
    });
    
    buttonArea.appendChild(selectDirectBtn);
    buttonArea.appendChild(cancelBtn);
    
    // 组合模态窗口
    modal.appendChild(header);
    modal.appendChild(searchContainer);
    modal.appendChild(listContainer);
    modal.appendChild(buttonArea);
    
    overlay.appendChild(modal);
    
    // 将模态窗口添加到页面
    document.body.appendChild(overlay);
    
    // 高亮元素函数
    function highlightElement(element) {
      // 移除之前的高亮
      removeHighlight();
      
      // 创建高亮元素
      const highlight = document.createElement('div');
      highlight.id = 'target-highlight';
      
      // 获取元素位置
      const rect = element.getBoundingClientRect();
      
      // 设置高亮样式 - 红色高亮
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #ff0000;
        background-color: rgba(255, 0, 0, 0.1);
        pointer-events: none;
        z-index: 10001;
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
      `;
      
      document.body.appendChild(highlight);
    }
    
    // 移除高亮函数
    function removeHighlight() {
      const highlight = document.getElementById('target-highlight');
      if (highlight) {
        document.body.removeChild(highlight);
      }
    }
  }
  
  // 开始框选模式
  function startBoxSelection() {
    // 确保高亮层已创建
    createHighlighter();
    
    let selectedDiv = null;
    let originalOverlay = document.getElementById('insert-target-modal-overlay');
    

    
    // 鼠标移动处理 - 预览悬停的div元素
    function handleMouseMove(e) {
      // 跳过面板和高亮层本身
      if (e.target === panel || e.target === highlighter || panel.contains(e.target)) {
        highlighter.style.display = 'none';
        return;
      }
      
      // 查找最近的div元素
      let targetDiv = e.target;
      while (targetDiv && targetDiv.tagName.toLowerCase() !== 'div' && targetDiv.tagName.toLowerCase() !== 'body') {
        targetDiv = targetDiv.parentElement;
      }
      
      // 如果找到div元素，高亮显示
      if (targetDiv && targetDiv.tagName.toLowerCase() === 'div') {
        const rect = targetDiv.getBoundingClientRect();
        highlighter.style.display = 'block';
        highlighter.style.left = `${rect.left}px`;
        highlighter.style.top = `${rect.top}px`;
        highlighter.style.width = `${rect.width}px`;
        highlighter.style.height = `${rect.height}px`;
      } else {
        highlighter.style.display = 'none';
      }
    }
    
    // 鼠标点击事件 - 直接选择点击的div元素
    function handleMouseClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 跳过面板、高亮层本身以及模态窗口中的按钮
      if (e.target === panel || e.target === highlighter || panel.contains(e.target) || 
          (originalOverlay && originalOverlay.contains(e.target))) {
        return;
      }
      
      // 查找最近的div元素
      let targetDiv = e.target;
      while (targetDiv && targetDiv.tagName.toLowerCase() !== 'div' && targetDiv.tagName.toLowerCase() !== 'body') {
        targetDiv = targetDiv.parentElement;
      }
      
      // 确保是有效的div元素
      if (targetDiv && targetDiv.tagName.toLowerCase() === 'div') {
        // 直接选择并插入，不需要双击确认
        selectedDiv = targetDiv;
        
        // 隐藏高亮
        highlighter.style.display = 'none';
        
        // 插入元素到选中的div
        insertElementIntoDiv(selectedDiv);
        
        // 清理所有元素和事件监听器
        cleanup();
        
        // 移除模态窗口
        if (originalOverlay && originalOverlay.parentNode) {
          document.body.removeChild(originalOverlay);
        }
      }
    }
    
    // 阻止选择模式下的事件
    function preventSelectionEvents(e) {
      // 跳过面板和高亮层本身
      if (e.target === panel || e.target === highlighter || panel.contains(e.target)) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // 键盘事件（ESC取消）
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        // 立即隐藏高亮
        highlighter.style.display = 'none';
        
        // 恢复模态窗口显示
        if (originalOverlay) {
          originalOverlay.style.display = 'flex';
        }
        cleanup();
      }
    }
    
    // 清理函数
    function cleanup() {
      // 隐藏高亮层
      highlighter.style.display = 'none';
      
      // 移除事件监听器
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
      document.removeEventListener('mouseover', preventSelectionEvents);
      document.removeEventListener('mouseout', preventSelectionEvents);
      document.removeEventListener('keydown', handleKeyDown);
    }
    
    // 添加事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleMouseClick);
    document.addEventListener('mouseover', preventSelectionEvents, true);
    document.addEventListener('mouseout', preventSelectionEvents, true);
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // 插入元素到选择的div中
  function insertElementIntoDiv(targetDiv) {
    if (!selectedElement || !targetDiv) return;
    
    // 克隆选中的元素
    const clonedElement = selectedElement.cloneNode(true);
    
    // 如果元素有ID，为克隆元素生成一个新的ID
    if (clonedElement.id) {
      clonedElement.id = `${clonedElement.id}-insert`;
    }
    
    // 移除之前可能添加的样式
    clonedElement.style.position = '';
    clonedElement.style.left = '';
    clonedElement.style.top = '';
    clonedElement.style.zIndex = '';
    clonedElement.style.marginLeft = '';
    
    // 插入到目标div中
    targetDiv.appendChild(clonedElement);
    
    // 保存选中元素的引用
    const originalElement = selectedElement;
    
    // 选择插入后的元素
    selectElement(clonedElement);
    
    // 删除原始元素
    if (originalElement.parentNode) {
      originalElement.parentNode.removeChild(originalElement);
    }
    
    // 显示成功提示
    showNotification('元素已成功移动到目标div！');
  }
  
  // 更新盒模型可视化
  function updateBoxModelOverlay() {
    if (!selectedElement || !boxModelOverlay) return;
    
    const rect = selectedElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(selectedElement);
    
    const marginTop = parseInt(computedStyle.marginTop) || 0;
    const marginRight = parseInt(computedStyle.marginRight) || 0;
    const marginBottom = parseInt(computedStyle.marginBottom) || 0;
    const marginLeft = parseInt(computedStyle.marginLeft) || 0;
    
    const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
    const borderRight = parseInt(computedStyle.borderRightWidth) || 0;
    const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
    const borderLeft = parseInt(computedStyle.borderLeftWidth) || 0;
    
    const paddingTop = parseInt(computedStyle.paddingTop) || 0;
    const paddingRight = parseInt(computedStyle.paddingRight) || 0;
    const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
    const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
    
    // 计算盒模型各区域的位置和尺寸
    const marginArea = {
      top: rect.top - marginTop,
      left: rect.left - marginLeft,
      width: rect.width + marginLeft + marginRight,
      height: rect.height + marginTop + marginBottom
    };
    
    const borderArea = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
    
    const paddingArea = {
      top: rect.top + borderTop,
      left: rect.left + borderLeft,
      width: rect.width - borderLeft - borderRight,
      height: rect.height - borderTop - borderBottom
    };
    
    const contentArea = {
      top: rect.top + borderTop + paddingTop,
      left: rect.left + borderLeft + paddingLeft,
      width: rect.width - borderLeft - borderRight - paddingLeft - paddingRight,
      height: rect.height - borderTop - borderBottom - paddingTop - paddingBottom
    };
    
    // 创建盒模型可视化HTML
    boxModelOverlay.innerHTML = `
      <div class="box-model-margin" style="
        position: absolute;
        top: ${marginArea.top}px;
        left: ${marginArea.left}px;
        width: ${marginArea.width}px;
        height: ${marginArea.height}px;
        border: 1px dashed #ff9900;
        background: rgba(255, 153, 0, 0.1);
      ">
        <div class="box-model-label" style="
          position: absolute;
          top: -20px;
          left: 0;
          font-size: 12px;
          color: #ff9900;
        ">Margin</div>
      </div>
      <div class="box-model-border" style="
        position: absolute;
        top: ${borderArea.top}px;
        left: ${borderArea.left}px;
        width: ${borderArea.width}px;
        height: ${borderArea.height}px;
        border: 1px dashed #3366ff;
        background: rgba(51, 102, 255, 0.1);
      ">
        <div class="box-model-label" style="
          position: absolute;
          top: -20px;
          left: 0;
          font-size: 12px;
          color: #3366ff;
        ">Border</div>
      </div>
      <div class="box-model-padding" style="
        position: absolute;
        top: ${paddingArea.top}px;
        left: ${paddingArea.left}px;
        width: ${paddingArea.width}px;
        height: ${paddingArea.height}px;
        border: 1px dashed #33cc33;
        background: rgba(51, 204, 51, 0.1);
      ">
        <div class="box-model-label" style="
          position: absolute;
          top: -20px;
          left: 0;
          font-size: 12px;
          color: #33cc33;
        ">Padding</div>
      </div>
      <div class="box-model-content" style="
        position: absolute;
        top: ${contentArea.top}px;
        left: ${contentArea.left}px;
        width: ${contentArea.width}px;
        height: ${contentArea.height}px;
        border: 1px dashed #ff3333;
        background: rgba(255, 51, 51, 0.1);
      ">
        <div class="box-model-label" style="
          position: absolute;
          top: -20px;
          left: 0;
          font-size: 12px;
          color: #ff3333;
        ">Content</div>
      </div>
    `;
  }
  
  // 创建响应式视口
  function createResponsiveViewport(width, height) {
    if (responsiveViewport) {
      responsiveViewport.remove();
    }
    
    responsiveViewport = document.createElement('div');
    responsiveViewport.id = 'responsive-viewport';
    responsiveViewport.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${width}px;
      height: ${height}px;
      background: white;
      border: 2px solid #333;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      z-index: 10001;
      overflow: auto;
      resize: both;
    `;
    
    // 添加视口标题栏
    const viewportHeader = document.createElement('div');
    viewportHeader.className = 'viewport-header';
    viewportHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #333;
      color: white;
      cursor: move;
      user-select: none;
    `;
    
    const viewportTitle = document.createElement('span');
    viewportTitle.textContent = `响应式视口 (${width}×${height})`;
    viewportTitle.style.fontSize = '14px';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: #ff3333;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    `;
    closeBtn.addEventListener('click', () => {
      responsiveViewport.remove();
      responsiveViewport = null;
    });
    
    viewportHeader.appendChild(viewportTitle);
    viewportHeader.appendChild(closeBtn);
    responsiveViewport.appendChild(viewportHeader);
    
    // 添加视口内容区域
    const viewportContent = document.createElement('div');
    viewportContent.style.cssText = `
      width: 100%;
      height: calc(100% - 40px);
      overflow: auto;
      position: relative;
    `;
    
    // 复制页面内容到视口中
    const pageContent = document.body.cloneNode(true);
    // 移除扩展相关元素
    const elementsToRemove = pageContent.querySelectorAll('#web-element-editor-panel, #web-element-highlighter, #box-model-overlay, #responsive-viewport');
    elementsToRemove.forEach(el => el.remove());
    
    viewportContent.appendChild(pageContent);
    responsiveViewport.appendChild(viewportContent);
    
    document.body.appendChild(responsiveViewport);
    
    // 添加ESC键关闭视口功能
    function handleEscKey(e) {
      if (e.key === 'Escape' && responsiveViewport) {
        responsiveViewport.remove();
        responsiveViewport = null;
        // 移除事件监听器，避免内存泄漏
        document.removeEventListener('keydown', handleEscKey);
      }
    }
    document.addEventListener('keydown', handleEscKey);
    
    // 使视口可拖动
    makeViewportDraggable(responsiveViewport, viewportHeader);
    
    return responsiveViewport;
  }
  
  // 使视口可拖动
  function makeViewportDraggable(viewport, header) {
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - viewport.getBoundingClientRect().left;
      offsetY = e.clientY - viewport.getBoundingClientRect().top;
      
      viewport.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      viewport.style.left = `${e.clientX - offsetX}px`;
      viewport.style.top = `${e.clientY - offsetY}px`;
      viewport.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      viewport.style.cursor = 'default';
    });
  }
  
  // 设置事件监听器
  function setupEventListeners() {
    // 鼠标移动时高亮元素
    document.addEventListener('mousemove', handleMouseMove);
    
    // 点击时选择元素
    document.addEventListener('click', handleElementClick, true);
    
    // 阻止选择模式下的默认行为
    document.addEventListener('mouseover', preventSelectionEvents, true);
    document.addEventListener('mouseout', preventSelectionEvents, true);
    
    // 键盘事件用于位置微调
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // 鼠标移动处理
  function handleMouseMove(e) {
    if (!isSelecting) return;
    
    const element = e.target;
    
    // 跳过面板和高亮层本身
    if (element === panel || element === highlighter || panel.contains(element) || element === boxModelOverlay) {
      highlighter.style.display = 'none';
      return;
    }
    
    // 高亮当前元素
    const rect = element.getBoundingClientRect();
    highlighter.style.display = 'block';
    highlighter.style.left = `${rect.left}px`;
    highlighter.style.top = `${rect.top}px`;
    highlighter.style.width = `${rect.width}px`;
    highlighter.style.height = `${rect.height}px`;
  }
  
  // 元素点击处理
  function handleElementClick(e) {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.target;
    
    // 跳过面板和高亮层本身
    if (element === panel || element === highlighter || panel.contains(element) || element === boxModelOverlay) {
      return;
    }
    
    // 选择元素
    selectElement(element);
    isSelecting = false;
    
    // 更新选择按钮状态
    const selectBtn = document.getElementById('select-element-btn');
    if (selectBtn) {
      selectBtn.textContent = '选择元素';
      selectBtn.classList.remove('active');
    }
    


    
    return false;
  }
  
  // 阻止选择模式下的事件
  function preventSelectionEvents(e) {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 跳过面板和高亮层本身
    if (e.target === panel || e.target === highlighter || panel.contains(e.target) || e.target === boxModelOverlay) {
      return;
    }
    
    return false;
  }
  
  // 键盘事件处理
  function handleKeyDown(e) {
    if (!isExtensionActive) return;
    
    // ESC键取消选择
    if (e.key === 'Escape') {
      if (isSelecting) {
        e.preventDefault();
        e.stopPropagation();
        
        // 取消选择模式
        isSelecting = false;
        
        // 隐藏高亮层
        if (highlighter) {
          highlighter.style.display = 'none';
        }
        
        // 更新选择按钮状态
        const selectBtn = document.getElementById('select-element-btn');
        if (selectBtn) {
          selectBtn.textContent = '选择元素';
          selectBtn.classList.remove('active');
        }
        

      }
      return;
    }
    
    // 如果没有选中元素，不需要处理其他键盘事件
    if (!selectedElement) return;
    
    // 检查是否按下了方向键，并且Ctrl键被按下（用于微调）
    if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      adjustElementPosition(e.key);
    }
  }
  
  // 调整元素位置
  function adjustElementPosition(direction) {
    if (!selectedElement) return;
    
    const computedStyle = window.getComputedStyle(selectedElement);
    const position = computedStyle.position;
    
    if (position === 'static') {
      alert('静态定位元素无法微调位置，请先更改定位方式。');
      return;
    }
    
    const distance = parseInt(document.getElementById('adjustment-distance').value) || 1;
    let top = parseInt(selectedElement.style.top) || 0;
    let left = parseInt(selectedElement.style.left) || 0;
    let right = parseInt(selectedElement.style.right) || 0;
    let bottom = parseInt(selectedElement.style.bottom) || 0;
    
    switch (direction) {
      case 'ArrowUp':
        if (position === 'absolute' || position === 'fixed') {
          selectedElement.style.top = `${top - distance}px`;
        }
        break;
      case 'ArrowDown':
        if (position === 'absolute' || position === 'fixed') {
          selectedElement.style.top = `${top + distance}px`;
        }
        break;
      case 'ArrowLeft':
        if (position === 'absolute' || position === 'fixed') {
          selectedElement.style.left = `${left - distance}px`;
        }
        break;
      case 'ArrowRight':
        if (position === 'absolute' || position === 'fixed') {
          selectedElement.style.left = `${left + distance}px`;
        }
        break;
    }
    
    // 更新位置信息
    updateElementInfo();
    
    // 更新盒模型可视化（直接更新，无需检查勾选框）
    updateBoxModelOverlay();
  }
  
  // 选择元素
  function selectElement(element) {
    // 如果当前处于拖拽状态，先结束拖拽
    if (isDragging) {
      endElementDrag();
      const dragBtn = document.getElementById('drag-element-btn');
      if (dragBtn) {
        dragBtn.textContent = '开始拖拽';
        dragBtn.style.backgroundColor = '';
      }
    }
    
    selectedElement = element;
    
    // 隐藏高亮层
    highlighter.style.display = 'none';
    
    // 更新元素信息
    updateElementInfo();
    
    // 显示编辑面板
    showEditorPanels();
    
    // 显示拖拽按钮
    const dragBtn = document.getElementById('drag-element-btn');
    if (dragBtn) {
      dragBtn.style.display = 'inline-block';
    }
  }
  
  // 更新元素信息
  function updateElementInfo() {
    if (!selectedElement) return;
    
    const rect = selectedElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(selectedElement);
    
    // 更新基本信息
    document.getElementById('element-tag').textContent = selectedElement.tagName.toLowerCase();
    document.getElementById('element-id').textContent = selectedElement.id || '无';
    document.getElementById('element-class').textContent = selectedElement.className || '无';
    document.getElementById('element-size').textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    document.getElementById('element-position').textContent = `${Math.round(rect.left)}×${Math.round(rect.top)}`;
    
    // 更新文本编辑器
    if (selectedElement.textContent !== undefined) {
      document.getElementById('element-text').value = selectedElement.textContent;
    }
    
    // 更新属性编辑器
    document.getElementById('element-id-input').value = selectedElement.id || '';
    document.getElementById('element-class-input').value = selectedElement.className || '';
    document.getElementById('element-title-input').value = selectedElement.title || '';
    document.getElementById('element-href-input').value = selectedElement.href || selectedElement.getAttribute('href') || '';
    
    // 更新样式编辑器
    document.getElementById('font-size-input').value = computedStyle.fontSize;
    document.getElementById('font-color-input').value = rgbToHex(computedStyle.color);
    document.getElementById('bg-color-input').value = rgbToHex(computedStyle.backgroundColor);
    document.getElementById('font-family-select').value = computedStyle.fontFamily;
    document.getElementById('text-align-select').value = computedStyle.textAlign;
    document.getElementById('border-input').value = computedStyle.border;
    document.getElementById('padding-input').value = computedStyle.padding;
    document.getElementById('margin-input').value = computedStyle.margin;
    
    // 更新位置编辑器
    document.getElementById('position-select').value = computedStyle.position;
    document.getElementById('top-input').value = selectedElement.style.top || '';
    document.getElementById('right-input').value = selectedElement.style.right || '';
    document.getElementById('bottom-input').value = selectedElement.style.bottom || '';
    document.getElementById('left-input').value = selectedElement.style.left || '';
    
    // 更新盒模型编辑器
    document.getElementById('box-margin-input').value = computedStyle.margin;
    document.getElementById('box-border-input').value = computedStyle.border;
    document.getElementById('box-padding-input').value = computedStyle.padding;
    document.getElementById('box-width-input').value = selectedElement.style.width || computedStyle.width;
    document.getElementById('box-height-input').value = selectedElement.style.height || computedStyle.height;
    
    // 更新动画编辑器
    document.getElementById('transition-property').value = computedStyle.transitionProperty;
    document.getElementById('transition-duration').value = computedStyle.transitionDuration;
    document.getElementById('transition-timing').value = computedStyle.transitionTimingFunction;
    
    // 更新图片编辑器（如果是图片元素）
    if (selectedElement.tagName.toLowerCase() === 'img') {
      document.getElementById('image-src-input').value = selectedElement.src || '';
      document.getElementById('image-alt-input').value = selectedElement.alt || '';
      document.getElementById('image-width-input').value = selectedElement.style.width || computedStyle.width;
      document.getElementById('image-height-input').value = selectedElement.style.height || computedStyle.height;
    }
    
    // 更新代码编辑器
    document.getElementById('element-html').value = selectedElement.outerHTML;
  }
  
  // 显示编辑面板
  function showEditorPanels() {
    // 显示所有编辑器
    document.getElementById('element-info').classList.remove('hidden');
    document.getElementById('element-actions').classList.remove('hidden');
    document.getElementById('element-editor').classList.remove('hidden');
    document.getElementById('position-editor').classList.remove('hidden');
    document.getElementById('box-model-editor').classList.remove('hidden');
    document.getElementById('responsive-editor').classList.remove('hidden');
    document.getElementById('animation-editor').classList.remove('hidden');
    document.getElementById('code-editor').classList.remove('hidden');
    
    // 根据元素类型显示/隐藏特定编辑器
    if (selectedElement.tagName.toLowerCase() === 'img') {
      document.getElementById('image-editor').classList.remove('hidden');
      document.getElementById('text-editor').classList.add('hidden');
    } else {
      document.getElementById('image-editor').classList.add('hidden');
      document.getElementById('text-editor').classList.remove('hidden');
    }
    
    // 如果是链接元素，显示链接地址编辑
    if (selectedElement.tagName.toLowerCase() === 'a') {
      document.getElementById('element-href-input').parentElement.style.display = 'flex';
    } else {
      document.getElementById('element-href-input').parentElement.style.display = 'none';
    }
  }
  
  // 搜索元素
  function searchElements(query) {
    if (!query || query.trim() === '') {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('search-loading').style.display = 'none';
      return;
    }
    
    // 显示加载指示器
    const loadingIndicator = document.getElementById('search-loading');
    loadingIndicator.style.display = 'block';
    
    // 清空之前的搜索结果
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';
    
    // 设置搜索变量
    const searchQuery = query.toLowerCase().trim();
    const results = [];
    let currentIndex = 0;
    
    // 搜索所有可见元素
    const allElements = Array.from(document.body.querySelectorAll('*'));
    
    // 逐个处理元素并显示结果
    function processNextElement() {
      // 如果处理完所有元素，结束搜索
      if (currentIndex >= allElements.length) {
        loadingIndicator.style.display = 'none';
        // 如果没有找到任何结果，显示提示信息
        if (results.length === 0) {
          const noResults = document.createElement('div');
          noResults.style.cssText = 'padding: 10px; text-align: center; color: #666;';
          noResults.textContent = '未找到匹配的元素';
          resultsContainer.appendChild(noResults);
        }
        return;
      }
      
      // 处理当前元素
      const element = allElements[currentIndex];
      currentIndex++;
      
      // 跳过编辑器自身的元素
      if (element.id === 'web-element-editor-panel' || 
          element.id === 'web-element-highlighter' || 
          element.id === 'box-model-overlay' || 
          element.id === 'web-element-editor-ball' ||
          document.getElementById('web-element-editor-panel')?.contains(element)) {
        // 继续处理下一个元素
        setTimeout(processNextElement, 0);
        return;
      }
      
      // 获取元素信息进行匹配
      const tagName = element.tagName.toLowerCase();
      const id = element.id.toLowerCase();
      const className = element.className.toLowerCase();
      const textContent = element.textContent.toLowerCase();
      
      // 检查是否匹配任一属性
      if (tagName.includes(searchQuery) || 
          id.includes(searchQuery) || 
          className.includes(searchQuery) || 
          textContent.includes(searchQuery)) {
        
        // 创建结果对象
        let displayText = tagName;
        if (id) displayText += `#${id}`;
        if (className) displayText += `.${className.replace(/\s+/g, '.')}`;
        
        // 截取部分文本内容作为预览
        let preview = textContent.trim();
        if (preview.length > 30) {
          preview = preview.substring(0, 30) + '...';
        }
        
        // 获取最基本的位置和大小信息用于辨别
        const rect = element.getBoundingClientRect();
        
        // 获取关键样式信息
        const computedStyle = window.getComputedStyle(element);
        const display = computedStyle.display;
        
        const result = {
          element: element,
          displayText: displayText,
          preview: preview,
          // 保留关键信息
          size: `(${Math.round(rect.width)}×${Math.round(rect.height)})`,
          display: display,
          index: currentIndex
        };
        
        results.push(result);
        
        // 立即创建并添加结果项到结果容器
        createAndAppendResultItem(result, resultsContainer);
      }
      
      // 继续处理下一个元素
      setTimeout(processNextElement, 0);
    }
    
    // 开始处理元素
    processNextElement();
  }
  
  // 创建并添加结果项
  function createAndAppendResultItem(result, container) {
    const resultItem = document.createElement('div');
    resultItem.style.cssText = `padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;`;
    
    // 简化的信息展示
    resultItem.innerHTML = `
      <div style="display: flex; align-items: center; font-size: 13px;">
        <span style="font-weight: 500; flex: 1;">${result.displayText}</span>
        <span style="display: inline-flex; gap: 6px; font-size: 11px; color: #666;">
          <span>${result.size}</span>
          <span>${result.display}</span>
        </span>
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 3px;">${result.preview}</div>
    `;
    
    // 添加鼠标悬停效果
    resultItem.addEventListener('mouseenter', () => {
      resultItem.style.backgroundColor = '#f5f5f5';
      // 高亮当前预览的元素
      highlightElement(result.element);
    });
    
    resultItem.addEventListener('mouseleave', () => {
      resultItem.style.backgroundColor = '';
      // 移除非选中状态的高亮
      if (!selectedElement || selectedElement !== result.element) {
        removeHighlight();
      }
    });
    
    // 点击选择元素
    resultItem.addEventListener('click', () => {
      selectElement(result.element);
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('search-loading').style.display = 'none';
    });
    
    container.appendChild(resultItem);
  }
  
  // 显示搜索结果（现在主要由createAndAppendResultItem处理）
  function displaySearchResults(results) {
    // 这个函数现在主要作为向后兼容使用
    // 实际的搜索结果显示已经在searchElements中实时处理
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.style.cssText += 'font-size: 12px; line-height: 1.4;';
    resultsContainer.style.display = 'block';
  }
  
  // 临时高亮元素进行预览
  function highlightElement(element) {
    if (!highlighter) return;
    
    const rect = element.getBoundingClientRect();
    highlighter.style.display = 'block';
    highlighter.style.left = `${rect.left}px`;
    highlighter.style.top = `${rect.top}px`;
    highlighter.style.width = `${rect.width}px`;
    highlighter.style.height = `${rect.height}px`;
  }
  
  // 移除临时高亮
  function removeHighlight() {
    if (highlighter && !isSelecting) {
      highlighter.style.display = 'none';
    }
  }
  
  // 设置面板事件监听器
  function setupPanelEventListeners() {
    // 搜索元素功能
    document.getElementById('search-element-btn').addEventListener('click', () => {
      const query = document.getElementById('element-search-input').value;
      searchElements(query);
    });
    
    // 支持回车键搜索
    document.getElementById('element-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value;
        searchElements(query);
      }
    });
    
    // 点击面板其他区域关闭搜索结果
    panel.addEventListener('click', (e) => {
      const searchInput = document.getElementById('element-search-input');
      const searchBtn = document.getElementById('search-element-btn');
      const searchResults = document.getElementById('search-results');
      const searchLoading = document.getElementById('search-loading');
      
      if (!searchInput.contains(e.target) && 
          !searchBtn.contains(e.target) && 
          !searchResults.contains(e.target) &&
          !searchLoading.contains(e.target)) {
        searchResults.style.display = 'none';
        searchLoading.style.display = 'none';
      }
    });
    
    // 点击页面其他地方关闭搜索结果和加载指示器
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('web-element-editor-panel');
      const searchInput = document.getElementById('element-search-input');
      const searchBtn = document.getElementById('search-element-btn');
      const searchResults = document.getElementById('search-results');
      const searchLoading = document.getElementById('search-loading');
      
      if (panel && !panel.contains(e.target)) {
        searchResults.style.display = 'none';
        searchLoading.style.display = 'none';
      }
    });
    
    // 选择元素按钮
    document.getElementById('select-element-btn').addEventListener('click', () => {
      isSelecting = !isSelecting;
      const btn = document.getElementById('select-element-btn');
      
      if (isSelecting) {
        btn.textContent = '选择中...';
        btn.classList.add('active');

      } else {
        btn.textContent = '选择元素';
        btn.classList.remove('active');
        highlighter.style.display = 'none';
      }
    });
    
    // 清除选择按钮
    document.getElementById('clear-selection-btn').addEventListener('click', () => {
      selectedElement = null;
      isSelecting = false;
      
      if (isDragging) {
        endElementDrag();
        const dragBtn = document.getElementById('drag-element-btn');
        if (dragBtn) {
          dragBtn.textContent = '开始拖拽';
          dragBtn.style.backgroundColor = '';
        }
      }
      
      document.getElementById('select-element-btn').textContent = '选择元素';
      document.getElementById('select-element-btn').classList.remove('active');
      
      highlighter.style.display = 'none';
      boxModelOverlay.style.display = 'none';
      
      const dragBtn = document.getElementById('drag-element-btn');
      if (dragBtn) {
        dragBtn.style.display = 'none';
      }
      
      // 隐藏编辑面板
      document.getElementById('element-info').classList.add('hidden');
      document.getElementById('element-actions').classList.add('hidden');
      document.getElementById('element-editor').classList.add('hidden');
      document.getElementById('position-editor').classList.add('hidden');
      document.getElementById('box-model-editor').classList.add('hidden');
      document.getElementById('responsive-editor').classList.add('hidden');
      document.getElementById('animation-editor').classList.add('hidden');
      document.getElementById('code-editor').classList.add('hidden');
    });
    
    // 删除元素按钮
    document.getElementById('remove-element-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      selectedElement.remove();
      selectedElement = null;
      
      // 隐藏编辑面板
      document.getElementById('element-info').classList.add('hidden');
      document.getElementById('element-actions').classList.add('hidden');
      document.getElementById('element-editor').classList.add('hidden');
        document.getElementById('position-editor').classList.add('hidden');
        document.getElementById('box-model-editor').classList.add('hidden');
        document.getElementById('responsive-editor').classList.add('hidden');
        document.getElementById('animation-editor').classList.add('hidden');
        document.getElementById('code-editor').classList.add('hidden');
        
        boxModelOverlay.style.display = 'none';
        
        const dragBtn = document.getElementById('drag-element-btn');
        if (dragBtn) {
          dragBtn.style.display = 'none';
        }
        
        isSelecting = false;
        document.getElementById('select-element-btn').textContent = '选择元素';
        document.getElementById('select-element-btn').classList.remove('active');
    });
    
    // 复制元素代码按钮
    document.getElementById('copy-element-code-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      // 获取元素的完整HTML代码
      const elementCode = selectedElement.outerHTML;
      
      // 使用现代的Clipboard API复制文本
      navigator.clipboard.writeText(elementCode).then(() => {
        // 显示复制成功提示
        showNotification('元素代码已复制到剪贴板！');
      }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案：使用传统的复制方法
        const textArea = document.createElement('textarea');
        textArea.value = elementCode;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showNotification('元素代码已复制到剪贴板！');
        } catch (err) {
          showNotification('复制失败，请手动选择复制');
        }
        document.body.removeChild(textArea);
      });
    });
    
    // 克隆元素按钮
    document.getElementById('clone-element-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      // 克隆选中的元素
      const clonedElement = selectedElement.cloneNode(true);
      
      // 为克隆的元素添加一个标识类名，避免与原元素冲突
      clonedElement.classList.add('cloned-element');
      
      // 如果元素有ID，为克隆元素生成一个新的ID
      if (clonedElement.id) {
        clonedElement.id = `${clonedElement.id}-clone`;
      }
      
      // 设置克隆元素为fixed定位，固定在左上角，不影响原布局
      clonedElement.style.position = 'fixed';
      clonedElement.style.left = '0';
      clonedElement.style.top = '0';
      clonedElement.style.zIndex = '9999'; // 确保显示在顶部
      clonedElement.style.pointerEvents = 'auto'; // 确保可以交互
      
      // 插入克隆元素到body中
      document.body.appendChild(clonedElement);
      
      // 选择克隆后的元素
      selectElement(clonedElement);
      
      // 显示成功提示
      showNotification('元素已成功克隆！');
    });
    
    // 插入到div按钮
    document.getElementById('insert-into-div-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      // 创建一个模态窗口用于选择目标div
      createInsertTargetModal();
    });
    
    // 应用文本按钮
    document.getElementById('apply-text-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const newText = document.getElementById('element-text').value;
      selectedElement.textContent = newText;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
    });
    
    // 应用样式按钮
    document.getElementById('apply-style-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const fontSize = document.getElementById('font-size-input').value;
      const fontColor = document.getElementById('font-color-input').value;
      const bgColor = document.getElementById('bg-color-input').value;
      const fontFamily = document.getElementById('font-family-select').value;
      const textAlign = document.getElementById('text-align-select').value;
      const border = document.getElementById('border-input').value;
      const padding = document.getElementById('padding-input').value;
      const margin = document.getElementById('margin-input').value;
      
      if (fontSize) selectedElement.style.fontSize = fontSize;
      if (fontColor) selectedElement.style.color = fontColor;
      if (bgColor) selectedElement.style.backgroundColor = bgColor;
      if (fontFamily) selectedElement.style.fontFamily = fontFamily;
      if (textAlign) selectedElement.style.textAlign = textAlign;
      if (border) selectedElement.style.border = border;
      if (padding) selectedElement.style.padding = padding;
      if (margin) selectedElement.style.margin = margin;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
      
      // 更新盒模型可视化
      updateBoxModelOverlay();
    });
    
    // 应用属性按钮
    document.getElementById('apply-attributes-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const id = document.getElementById('element-id-input').value;
      const className = document.getElementById('element-class-input').value;
      const title = document.getElementById('element-title-input').value;
      const href = document.getElementById('element-href-input').value;
      
      if (id) selectedElement.id = id;
      if (className) selectedElement.className = className;
      if (title) selectedElement.title = title;
      if (href && selectedElement.tagName.toLowerCase() === 'a') {
        selectedElement.href = href;
      }
      
      // 更新元素信息
      updateElementInfo();
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
    });
    
    // 应用图片设置按钮
    document.getElementById('apply-image-btn').addEventListener('click', () => {
      if (!selectedElement || selectedElement.tagName.toLowerCase() !== 'img') return;
      
      const src = document.getElementById('image-src-input').value;
      const alt = document.getElementById('image-alt-input').value;
      const width = document.getElementById('image-width-input').value;
      const height = document.getElementById('image-height-input').value;
      
      if (src) selectedElement.src = src;
      if (alt) selectedElement.alt = alt;
      if (width) selectedElement.style.width = width;
      if (height) selectedElement.style.height = height;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
      
      // 更新盒模型可视化
      updateBoxModelOverlay();
    });
    
    // 位置编辑器事件
    setupPositionEditorEvents();
    
    // 盒模型编辑器事件
    setupBoxModelEditorEvents();
    
    // 响应式编辑器事件
    setupResponsiveEditorEvents();
    
    // 动画编辑器事件
    setupAnimationEditorEvents();
    
    // 应用代码按钮 - 修正后的版本
    document.getElementById('apply-html-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const newHTML = document.getElementById('element-html').value;
      
      try {
        // 创建一个临时元素来解析HTML
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        
        const newElement = temp.firstElementChild;
        
        if (!newElement) {
          alert('HTML代码无效！');
          return;
        }
        
        // 不再检查标签名是否匹配，允许用户修改元素类型
        
        // 保存原始元素的引用和位置
        const parent = selectedElement.parentNode;
        const nextSibling = selectedElement.nextSibling;
        
        // 完全替换元素，允许改变元素类型
        if (newElement.tagName !== selectedElement.tagName) {
          // 保存原始元素的事件监听器和其他动态属性（如果需要）
          
          // 插入新元素到原位置
          if (nextSibling) {
            parent.insertBefore(newElement, nextSibling);
          } else {
            parent.appendChild(newElement);
          }
          
          // 移除旧元素
          parent.removeChild(selectedElement);
          
          // 更新选中元素引用
          selectedElement = newElement;
        } else {
          // 如果元素类型相同，只更新属性和内容
          while (selectedElement.attributes.length > 0) {
            selectedElement.removeAttribute(selectedElement.attributes[0].name);
          }
          
          for (let i = 0; i < newElement.attributes.length; i++) {
            const attr = newElement.attributes[i];
            selectedElement.setAttribute(attr.name, attr.value);
          }
          
          // 更新内部HTML
          selectedElement.innerHTML = newElement.innerHTML;
        }
        
        // 更新元素信息
        updateElementInfo();
        
        // 更新盒模型可视化（直接更新，无需检查勾选框）
        updateBoxModelOverlay();
        
      } catch (e) {
        alert('HTML代码无效！');
        console.error(e);
      }
    });
    
    // 最小化按钮
    document.getElementById('minimize-btn').addEventListener('click', () => {
      const content = document.querySelector('.panel-content');
      const minimizeBtn = document.getElementById('minimize-btn');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        minimizeBtn.textContent = '−';
      } else {
        content.style.display = 'none';
        minimizeBtn.textContent = '+';
      }
    });
    
    // 关闭按钮
    document.getElementById('close-btn').addEventListener('click', () => {
      // 隐藏面板并显示悬浮球，而不是完全移除
      hidePanel();
      
      // 重置选择状态
      selectedElement = null;
      isSelecting = false;
      
      // 如果正在拖拽，先结束拖拽
      if (isDragging) {
        endElementDrag();
      }
      
      if (highlighter) {
        highlighter.style.display = 'none';
      }
      
      if (boxModelOverlay) {
        boxModelOverlay.style.display = 'none';
      }
      
      // 隐藏所有编辑面板
      if (panel) {
        const sections = panel.querySelectorAll('.section');
        sections.forEach(section => {
          if (section.id !== 'source-code-editor') {
            section.classList.add('hidden');
          }
        });
      }
    });
    
    // 使面板可拖动
    makePanelDraggable();
    
    // 拖拽元素按钮
    document.getElementById('drag-element-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const dragBtn = document.getElementById('drag-element-btn');
      
      if (!isDragging) {
        // 开始拖拽
        startElementDrag(selectedElement);
        dragBtn.textContent = '结束拖拽';
        // 结束拖拽状态显示红色
        dragBtn.style.backgroundColor = '#ff3333';
      } else {
        // 结束拖拽
        endElementDrag();
        dragBtn.textContent = '开始拖拽';
        // 移除内联背景样式，保持primary-btn样式一致
        dragBtn.style.backgroundColor = '';
      }
    });
    
    // 复制网页源代码按钮
    document.getElementById('copy-source-code-btn').addEventListener('click', async () => {
      try {
        const cleanSourceCode = getCleanSourceCode();
        await navigator.clipboard.writeText(cleanSourceCode);
        showNotification('网页源代码已复制到剪贴板！');
      } catch (err) {
        // 降级方案：使用传统方式复制
        const textArea = document.createElement('textarea');
        textArea.value = getCleanSourceCode();
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showNotification('网页源代码已复制到剪贴板！');
        } catch (fallbackErr) {
          alert('复制失败，请手动复制源代码。');
          console.error('复制错误:', fallbackErr);
        }
        document.body.removeChild(textArea);
      }
    });
    
    // 复制网页源代码功能保留
  }
  
  // 获取纯净的网页源代码（排除扩展注入的元素）
  function getCleanSourceCode() {
    // 创建文档的克隆
    const docClone = document.cloneNode(true);
    
    // 移除扩展注入的元素
    const extensionElements = docClone.querySelectorAll(
      '#web-element-editor-panel, #web-element-highlighter, #box-model-overlay, #responsive-viewport, #element-editor-animations, #web-element-editor-ball, #web-element-editor-close-btn'
    );
    extensionElements.forEach(el => el.remove());
    
    // 获取整个HTML内容
    return '<!DOCTYPE html>\n' + docClone.documentElement.outerHTML;
  }
  
  // 保留获取纯净网页源代码的函数，用于复制功能
  
  // 显示通知
  function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'editor-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10003;
      font-size: 14px;
      animation: editor-fade 0.3s ease-in-out;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease-in-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }
  

  
  // 设置位置编辑器事件
  function setupPositionEditorEvents() {
    // 位置选择
    document.getElementById('position-select').addEventListener('change', () => {
      if (!selectedElement) return;
      
      const position = document.getElementById('position-select').value;
      selectedElement.style.position = position;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
    });
    
    // 方向按钮
    const directionButtons = document.querySelectorAll('.direction-btn');
    directionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!selectedElement) return;
        
        const direction = btn.getAttribute('data-direction');
        const distance = parseInt(document.getElementById('adjustment-distance').value) || 1;
        const computedStyle = window.getComputedStyle(selectedElement);
        const position = computedStyle.position;
        
        if (position === 'static') {
          alert('静态定位元素无法微调位置，请先更改定位方式。');
          return;
        }
        
        let top = parseInt(selectedElement.style.top) || 0;
        let left = parseInt(selectedElement.style.left) || 0;
        let right = parseInt(selectedElement.style.right) || 0;
        let bottom = parseInt(selectedElement.style.bottom) || 0;
        
        switch (direction) {
          case 'up':
            selectedElement.style.top = `${top - distance}px`;
            break;
          case 'down':
            selectedElement.style.top = `${top + distance}px`;
            break;
          case 'left':
            selectedElement.style.left = `${left - distance}px`;
            break;
          case 'right':
            selectedElement.style.left = `${left + distance}px`;
            break;
          case 'center':
            // 居中元素
            if (position === 'absolute' || position === 'fixed') {
              const parentRect = selectedElement.parentElement.getBoundingClientRect();
              const elementRect = selectedElement.getBoundingClientRect();
              
              selectedElement.style.left = `${(parentRect.width - elementRect.width) / 2}px`;
              selectedElement.style.top = `${(parentRect.height - elementRect.height) / 2}px`;
            }
            break;
        }
        
        // 更新位置信息
        updateElementInfo();
        
        // 更新盒模型可视化（直接更新，无需检查勾选框）
        updateBoxModelOverlay();
      });
    });
    
    // 应用位置按钮
    document.getElementById('apply-position-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const top = document.getElementById('top-input').value;
      const right = document.getElementById('right-input').value;
      const bottom = document.getElementById('bottom-input').value;
      const left = document.getElementById('left-input').value;
      
      if (top) selectedElement.style.top = top;
      if (right) selectedElement.style.right = right;
      if (bottom) selectedElement.style.bottom = bottom;
      if (left) selectedElement.style.left = left;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
      
      // 更新盒模型可视化（直接更新，无需检查勾选框）
      updateBoxModelOverlay();
    });
  }
  
  // 设置盒模型编辑器事件
  function setupBoxModelEditorEvents() {
    // 移除盒模型切换逻辑（已删除勾选框）
    
    // 应用盒模型按钮
    document.getElementById('apply-box-model-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const margin = document.getElementById('box-margin-input').value;
      const border = document.getElementById('box-border-input').value;
      const padding = document.getElementById('box-padding-input').value;
      const width = document.getElementById('box-width-input').value;
      const height = document.getElementById('box-height-input').value;
      
      if (margin) selectedElement.style.margin = margin;
      if (border) selectedElement.style.border = border;
      if (padding) selectedElement.style.padding = padding;
      if (width) selectedElement.style.width = width;
      if (height) selectedElement.style.height = height;
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
      
      // 更新盒模型可视化（直接更新，无需检查勾选框）
      boxModelOverlay.style.display = 'block';
      updateBoxModelOverlay();
    });
  }
  
  // 设置响应式编辑器事件
  function setupResponsiveEditorEvents() {
    // 设备预设
    document.getElementById('device-preset').addEventListener('change', () => {
      const preset = document.getElementById('device-preset').value;
      let width, height;
      
      switch (preset) {
        case 'mobile':
          width = 375;
          height = 667;
          break;
        case 'tablet':
          width = 768;
          height = 1024;
          break;
        case 'laptop':
          width = 1366;
          height = 768;
          break;
        case 'desktop':
          width = 1920;
          height = 1080;
          break;
        default:
          return;
      }
      
      document.getElementById('viewport-width').value = width;
      document.getElementById('viewport-height').value = height;
    });
    
    // 应用视口按钮
    document.getElementById('apply-viewport-btn').addEventListener('click', () => {
      const width = document.getElementById('viewport-width').value;
      const height = document.getElementById('viewport-height').value;
      
      createResponsiveViewport(width, height);
    });
    
    // 重置视口按钮
    document.getElementById('reset-viewport-btn').addEventListener('click', () => {
      if (responsiveViewport) {
        responsiveViewport.remove();
        responsiveViewport = null;
      }
    });
  }
  
  // 设置动画编辑器事件
  function setupAnimationEditorEvents() {
    // 应用动画按钮
    document.getElementById('apply-animation-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const transitionProperty = document.getElementById('transition-property').value;
      const transitionDuration = document.getElementById('transition-duration').value;
      const transitionTiming = document.getElementById('transition-timing').value;
      const animationName = document.getElementById('animation-name').value;
      const animationDuration = document.getElementById('animation-duration').value;
      
      // 移除所有现有的动画类
      selectedElement.classList.remove(
        'editor-animation-fade',
        'editor-animation-slide',
        'editor-animation-bounce',
        'editor-animation-rotate',
        'editor-animation-pulse',
        'editor-animation-shake'
      );
      
      // 应用过渡效果
      if (transitionProperty && transitionDuration) {
        selectedElement.style.transition = `${transitionProperty} ${transitionDuration} ${transitionTiming}`;
      } else {
        selectedElement.style.transition = '';
      }
      
      // 应用动画
      if (animationName && animationDuration) {
        // 设置自定义动画时长
        const animationClass = `editor-animation-${animationName}`;
        selectedElement.classList.add(animationClass);
        selectedElement.style.animationDuration = animationDuration;
      }
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
    });
    
    // 预览动画按钮
    document.getElementById('preview-animation-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      const animationName = document.getElementById('animation-name').value;
      const animationDuration = document.getElementById('animation-duration').value;
      
      if (!animationName) {
        alert('请先选择动画类型');
        return;
      }
      
      // 移除所有现有的动画类
      selectedElement.classList.remove(
        'editor-animation-fade',
        'editor-animation-slide',
        'editor-animation-bounce',
        'editor-animation-rotate',
        'editor-animation-pulse',
        'editor-animation-shake'
      );
      
      // 强制重排以重新启动动画
      void selectedElement.offsetWidth;
      
      // 应用预览动画
      const animationClass = `editor-animation-${animationName}`;
      selectedElement.classList.add(animationClass);
      selectedElement.style.animationDuration = animationDuration || '1s';
      
      // 对于非循环动画，设置动画结束后移除类
      if (animationName !== 'rotate' && animationName !== 'pulse') {
        const onAnimationEnd = () => {
          selectedElement.classList.remove(animationClass);
          selectedElement.removeEventListener('animationend', onAnimationEnd);
        };
        selectedElement.addEventListener('animationend', onAnimationEnd);
      }
    });
    
    // 移除动画按钮
    document.getElementById('remove-animation-btn').addEventListener('click', () => {
      if (!selectedElement) return;
      
      // 移除所有动画类
      selectedElement.classList.remove(
        'editor-animation-fade',
        'editor-animation-slide',
        'editor-animation-bounce',
        'editor-animation-rotate',
        'editor-animation-pulse',
        'editor-animation-shake'
      );
      
      // 移除过渡效果
      selectedElement.style.transition = '';
      selectedElement.style.animationDuration = '';
      
      // 更新代码编辑器
      document.getElementById('element-html').value = selectedElement.outerHTML;
    });
  }
  
  // 使面板可拖动
  function makePanelDraggable() {
    const header = document.querySelector('.panel-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      
      panel.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.cursor = 'default';
    });
  }
  
  // 开始拖拽元素
  function startElementDrag(element) {
    if (!element) return;
    
    dragElement = element;
    isDragging = true;
    
    // 确保元素是可定位的
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    
    elementStartLeft = parseInt(element.style.left) || 0;
    elementStartTop = parseInt(element.style.top) || 0;
    
    element.style.outline = '2px solid #ff0000';
    element.style.zIndex = '10000';
    
    document.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    element.style.userSelect = 'none';
  }
  
  // 结束拖拽元素
  function endElementDrag() {
    if (!dragElement) return;
    
    isDragging = false;
    isMouseDown = false;
    
    dragElement.style.outline = '';
    
    document.removeEventListener('mousedown', handleDragStart);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    
    dragElement.style.userSelect = '';
    
    updateElementInfo();
    
    dragElement = null;
    
    const dragBtn = document.getElementById('drag-element-btn');
    if (dragBtn) {
      dragBtn.textContent = '开始拖拽';
      dragBtn.style.backgroundColor = '';
    }
  }
  
  // 处理拖拽开始
  function handleDragStart(e) {
    if (!isDragging || !dragElement) return;
    
    if (e.target === dragElement || dragElement.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡
      isMouseDown = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  }
  
  // 处理拖拽移动
  function handleDragMove(e) {
    if (!isDragging || !dragElement || !isMouseDown) return;
    
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡
    
    const newLeft = elementStartLeft + (e.clientX - dragStartX);
    const newTop = elementStartTop + (e.clientY - dragStartY);
    
    dragElement.style.left = `${newLeft}px`;
    dragElement.style.top = `${newTop}px`;
  }
  
  // 处理拖拽结束
  function handleDragEnd() {
    if (!isDragging || !dragElement) return;
    
    isMouseDown = false;
    
    elementStartLeft = parseInt(dragElement.style.left) || 0;
    elementStartTop = parseInt(dragElement.style.top) || 0;
  }
  
  // RGB颜色转十六进制
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#ffffff';
    
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) return '#ffffff';
    
    const r = parseInt(rgbValues[0]);
    const g = parseInt(rgbValues[1]);
    const b = parseInt(rgbValues[2]);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // 监听来自后台脚本的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'activate') {
      if (!isExtensionActive) {
        isExtensionActive = true;
        init();
      }
    } else if (message.action === 'deactivate') {
      if (panel) {
        panel.remove();
        panel = null;
      }
      
      if (highlighter) {
        highlighter.remove();
        highlighter = null;
      }
      
      if (boxModelOverlay) {
        boxModelOverlay.remove();
        boxModelOverlay = null;
      }
      
      if (responsiveViewport) {
        responsiveViewport.remove();
        responsiveViewport = null;
      }
      
      // 移除动画样式
      const animationStyle = document.getElementById('element-editor-animations');
      if (animationStyle) {
        animationStyle.remove();
      }
      
      isExtensionActive = false;
      isSelecting = false;
      selectedElement = null;
    }
  });
  
  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
