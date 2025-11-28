// ===== 应用状态 =====
let appData = {
  folders: [],
  notes: []
};

let currentFolderId = 'all';
let currentNoteId = null;
let saveTimeout = null;

// ===== DOM 元素 =====
const elements = {
  // 窗口控制
  minimizeBtn: document.getElementById('minimize-btn'),
  maximizeBtn: document.getElementById('maximize-btn'),
  closeBtn: document.getElementById('close-btn'),
  
  // 文件夹
  folderList: document.getElementById('folder-list'),
  addFolderBtn: document.getElementById('add-folder-btn'),
  allCount: document.getElementById('all-count'),
  
  // 笔记列表
  searchInput: document.getElementById('search-input'),
  addNoteBtn: document.getElementById('add-note-btn'),
  notesItems: document.getElementById('notes-items'),
  
  // 编辑器
  editorContainer: document.getElementById('editor-container'),
  folderSelect: document.getElementById('folder-select'),
  deleteNoteBtn: document.getElementById('delete-note-btn'),
  noteTitle: document.getElementById('note-title'),
  noteDate: document.getElementById('note-date'),
  noteChars: document.getElementById('note-chars'),
  noteContent: document.getElementById('note-content'),
  
  // 弹窗
  folderModal: document.getElementById('folder-modal'),
  folderNameInput: document.getElementById('folder-name-input'),
  cancelFolderBtn: document.getElementById('cancel-folder-btn'),
  confirmFolderBtn: document.getElementById('confirm-folder-btn'),
  
  deleteModal: document.getElementById('delete-modal'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
  
  // 右键菜单
  contextMenu: document.getElementById('context-menu'),
  renameFolderMenu: document.getElementById('rename-folder-menu'),
  deleteFolderMenu: document.getElementById('delete-folder-menu'),
  
  // 重命名弹窗
  renameFolderModal: document.getElementById('rename-folder-modal'),
  renameFolderInput: document.getElementById('rename-folder-input'),
  cancelRenameBtn: document.getElementById('cancel-rename-btn'),
  confirmRenameBtn: document.getElementById('confirm-rename-btn')
};

// 右键菜单相关状态
let contextFolderId = null;

// ===== 初始化 =====
async function init() {
  // 加载数据
  appData = await window.electronAPI.loadNotes();
  
  // 确保数据结构完整
  if (!appData.folders) appData.folders = [];
  if (!appData.notes) appData.notes = [];
  
  // 绑定事件
  bindEvents();
  
  // 渲染界面
  renderFolders();
  renderNotes();
  updateCounts();
}

// ===== 事件绑定 =====
function bindEvents() {
  // 窗口控制
  elements.minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
  elements.maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
  elements.closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
  
  // 文件夹操作
  elements.addFolderBtn.addEventListener('click', showFolderModal);
  elements.cancelFolderBtn.addEventListener('click', hideFolderModal);
  elements.confirmFolderBtn.addEventListener('click', createFolder);
  elements.folderNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createFolder();
  });
  
  // 笔记操作
  elements.addNoteBtn.addEventListener('click', createNote);
  elements.searchInput.addEventListener('input', handleSearch);
  elements.deleteNoteBtn.addEventListener('click', showDeleteModal);
  elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', deleteNote);
  
  // 编辑器
  elements.noteTitle.addEventListener('input', handleNoteChange);
  elements.noteContent.addEventListener('input', handleNoteChange);
  elements.folderSelect.addEventListener('change', handleFolderChange);
  
  // 点击弹窗外部关闭
  elements.folderModal.addEventListener('click', (e) => {
    if (e.target === elements.folderModal) hideFolderModal();
  });
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) hideDeleteModal();
  });
  
  // ESC 关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideFolderModal();
      hideDeleteModal();
      hideRenameFolderModal();
      hideContextMenu();
    }
  });
  
  // 右键菜单
  elements.renameFolderMenu.addEventListener('click', showRenameFolderModal);
  elements.deleteFolderMenu.addEventListener('click', deleteFolderFromMenu);
  
  // 重命名弹窗
  elements.cancelRenameBtn.addEventListener('click', hideRenameFolderModal);
  elements.confirmRenameBtn.addEventListener('click', renameFolder);
  elements.renameFolderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') renameFolder();
  });
  elements.renameFolderModal.addEventListener('click', (e) => {
    if (e.target === elements.renameFolderModal) hideRenameFolderModal();
  });
  
  // 点击其他地方关闭右键菜单
  document.addEventListener('click', (e) => {
    if (!elements.contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });
}

// ===== 自动清理空白笔记 =====
function cleanupEmptyNote() {
  if (!currentNoteId) return;
  
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  
  // 如果标题和内容都为空，删除这个笔记
  const titleEmpty = !note.title.trim();
  const contentEmpty = !note.content.trim();
  
  if (titleEmpty && contentEmpty) {
    const index = appData.notes.findIndex(n => n.id === currentNoteId);
    if (index !== -1) {
      appData.notes.splice(index, 1);
      saveData();
      updateCounts();
    }
  }
}

// ===== 文件夹操作 =====
function showFolderModal() {
  elements.folderModal.style.display = 'flex';
  elements.folderNameInput.value = '';
  elements.folderNameInput.focus();
}

function hideFolderModal() {
  elements.folderModal.style.display = 'none';
}

function createFolder() {
  const name = elements.folderNameInput.value.trim();
  if (!name) return;
  
  const folder = {
    id: generateId(),
    name: name,
    createdAt: new Date().toISOString()
  };
  
  appData.folders.push(folder);
  saveData();
  
  renderFolders();
  updateCounts();
  hideFolderModal();
}

function selectFolder(folderId) {
  // 切换前检查当前笔记是否为空，为空则删除
  cleanupEmptyNote();
  
  currentFolderId = folderId;
  currentNoteId = null;
  
  renderFolders();
  renderNotes();
  showEditorEmpty();
}

function renderFolders() {
  // 保留"全部备忘录"选项
  const allItem = elements.folderList.querySelector('[data-folder="all"]');
  elements.folderList.innerHTML = '';
  elements.folderList.appendChild(allItem);
  
  // 更新"全部"的激活状态
  allItem.classList.toggle('active', currentFolderId === 'all');
  
  // 为"全部备忘录"绑定点击事件
  allItem.onclick = () => selectFolder('all');
  
  // 渲染用户文件夹
  appData.folders.forEach(folder => {
    const count = appData.notes.filter(n => n.folderId === folder.id).length;
    const div = document.createElement('div');
    div.className = `folder-item${currentFolderId === folder.id ? ' active' : ''}`;
    div.dataset.folder = folder.id;
    div.innerHTML = `
      <svg class="folder-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${escapeHtml(folder.name)}</span>
      <span class="note-count">${count}</span>
    `;
    div.addEventListener('click', () => selectFolder(folder.id));
    div.addEventListener('contextmenu', (e) => showContextMenu(e, folder.id));
    elements.folderList.appendChild(div);
  });
  
  // 更新文件夹选择下拉框
  updateFolderSelect();
}

function updateFolderSelect() {
  elements.folderSelect.innerHTML = '<option value="">无文件夹</option>';
  appData.folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    elements.folderSelect.appendChild(option);
  });
  
  // 如果当前有选中的笔记，更新选中状态
  if (currentNoteId) {
    const note = appData.notes.find(n => n.id === currentNoteId);
    if (note) {
      elements.folderSelect.value = note.folderId || '';
    }
  }
}

function updateCounts() {
  elements.allCount.textContent = appData.notes.length;
}

// ===== 右键菜单 =====
function showContextMenu(e, folderId) {
  e.preventDefault();
  contextFolderId = folderId;
  
  const menu = elements.contextMenu;
  menu.style.display = 'block';
  
  // 计算位置，确保不超出屏幕
  let x = e.clientX;
  let y = e.clientY;
  
  const menuRect = menu.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  if (x + menuRect.width > windowWidth) {
    x = windowWidth - menuRect.width - 10;
  }
  if (y + menuRect.height > windowHeight) {
    y = windowHeight - menuRect.height - 10;
  }
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function hideContextMenu() {
  elements.contextMenu.style.display = 'none';
  contextFolderId = null;
}

function showRenameFolderModal() {
  const folderId = contextFolderId; // 先保存ID
  hideContextMenu();
  
  if (!folderId) return;
  
  const folder = appData.folders.find(f => f.id === folderId);
  if (!folder) return;
  
  contextFolderId = folderId; // 恢复ID供后续使用
  elements.renameFolderModal.style.display = 'flex';
  elements.renameFolderInput.value = folder.name;
  elements.renameFolderInput.focus();
  elements.renameFolderInput.select();
}

function hideRenameFolderModal() {
  elements.renameFolderModal.style.display = 'none';
}

function renameFolder() {
  if (!contextFolderId) return;
  
  const newName = elements.renameFolderInput.value.trim();
  if (!newName) return;
  
  const folder = appData.folders.find(f => f.id === contextFolderId);
  if (!folder) return;
  
  folder.name = newName;
  saveData();
  
  renderFolders();
  hideRenameFolderModal();
  contextFolderId = null;
}

function deleteFolderFromMenu() {
  const folderId = contextFolderId; // 先保存ID
  hideContextMenu();
  
  if (!folderId) return;
  
  // 删除文件夹
  const index = appData.folders.findIndex(f => f.id === folderId);
  if (index !== -1) {
    // 将该文件夹下的笔记移到"无文件夹"
    appData.notes.forEach(note => {
      if (note.folderId === folderId) {
        note.folderId = '';
      }
    });
    
    appData.folders.splice(index, 1);
    saveData();
    
    // 如果当前选中的是被删除的文件夹，切换到全部
    if (currentFolderId === folderId) {
      currentFolderId = 'all';
      renderNotes();
    }
    
    renderFolders();
    updateCounts();
  }
}

// ===== 笔记操作 =====
function createNote() {
  const note = {
    id: generateId(),
    title: '',
    content: '',
    folderId: currentFolderId === 'all' ? '' : currentFolderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  appData.notes.unshift(note);
  saveData();
  
  currentNoteId = note.id;
  renderNotes();
  renderFolders();
  updateCounts();
  showEditor(note);
  
  // 聚焦标题输入框
  elements.noteTitle.focus();
}

function selectNote(noteId) {
  // 切换前检查当前笔记是否为空，为空则删除
  cleanupEmptyNote();
  
  currentNoteId = noteId;
  const note = appData.notes.find(n => n.id === noteId);
  
  renderNotes();
  showEditor(note);
}

function handleSearch() {
  renderNotes();
}

function renderNotes() {
  const searchTerm = elements.searchInput.value.toLowerCase().trim();
  
  // 过滤笔记
  let filteredNotes = appData.notes.filter(note => {
    // 文件夹过滤
    if (currentFolderId !== 'all' && note.folderId !== currentFolderId) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.content.toLowerCase().includes(searchTerm);
      return titleMatch || contentMatch;
    }
    
    return true;
  });
  
  // 按更新时间排序
  filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  // 渲染
  if (filteredNotes.length === 0) {
    elements.notesItems.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <p>没有备忘录</p>
        <span>点击上方 + 按钮创建新备忘录</span>
      </div>
    `;
    return;
  }
  
  elements.notesItems.innerHTML = filteredNotes.map(note => `
    <div class="note-item${currentNoteId === note.id ? ' active' : ''}" data-note="${note.id}">
      <div class="note-item-title">${escapeHtml(note.title) || '新备忘录'}</div>
      <div class="note-item-preview">${escapeHtml(note.content) || '暂无内容'}</div>
      <div class="note-item-date">${formatDate(note.updatedAt)}</div>
    </div>
  `).join('');
  
  // 绑定点击事件
  elements.notesItems.querySelectorAll('.note-item').forEach(item => {
    item.addEventListener('click', () => selectNote(item.dataset.note));
  });
}

function showDeleteModal() {
  if (!currentNoteId) return;
  elements.deleteModal.style.display = 'flex';
}

function hideDeleteModal() {
  elements.deleteModal.style.display = 'none';
}

function deleteNote() {
  if (!currentNoteId) return;
  
  const index = appData.notes.findIndex(n => n.id === currentNoteId);
  if (index !== -1) {
    appData.notes.splice(index, 1);
    saveData();
  }
  
  currentNoteId = null;
  renderNotes();
  renderFolders();
  updateCounts();
  showEditorEmpty();
  hideDeleteModal();
}

// ===== 编辑器 =====
function showEditorEmpty() {
  elements.editorContainer.querySelector('.editor-empty').style.display = 'flex';
  elements.editorContainer.querySelector('.editor-active').style.display = 'none';
}

function showEditor(note) {
  elements.editorContainer.querySelector('.editor-empty').style.display = 'none';
  elements.editorContainer.querySelector('.editor-active').style.display = 'flex';
  
  elements.noteTitle.value = note.title;
  elements.noteContent.value = note.content;
  elements.folderSelect.value = note.folderId || '';
  elements.noteDate.textContent = formatDateTime(note.updatedAt);
  updateCharCount(note.content);
}

function handleNoteChange() {
  if (!currentNoteId) return;
  
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  
  note.title = elements.noteTitle.value;
  note.content = elements.noteContent.value;
  note.updatedAt = new Date().toISOString();
  
  elements.noteDate.textContent = formatDateTime(note.updatedAt);
  updateCharCount(note.content);
  
  // 防抖保存
  debounceSave();
  
  // 更新列表预览
  renderNotes();
}

function handleFolderChange() {
  if (!currentNoteId) return;
  
  const note = appData.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  
  note.folderId = elements.folderSelect.value;
  note.updatedAt = new Date().toISOString();
  
  saveData();
  renderFolders();
  
  // 如果当前在特定文件夹视图，可能需要刷新列表
  if (currentFolderId !== 'all' && note.folderId !== currentFolderId) {
    currentNoteId = null;
    renderNotes();
    showEditorEmpty();
  }
}

function updateCharCount(content) {
  const chars = content.length;
  elements.noteChars.textContent = `${chars} 字符`;
}

// ===== 数据保存 =====
function debounceSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveData();
  }, 500);
}

async function saveData() {
  await window.electronAPI.saveNotes(appData);
}

// ===== 工具函数 =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return `今天 ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
  }
  
  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && 
      date.getMonth() === yesterday.getMonth() && 
      date.getYear() === yesterday.getYear()) {
    return `昨天 ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
  }
  
  // 今年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  
  // 其他
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function padZero(num) {
  return num.toString().padStart(2, '0');
}

// ===== 启动应用 =====
init();

