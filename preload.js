// preload.js
const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Token management
  checkToken: () => ipcRenderer.invoke('check-token'),
  saveToken: (token, username) => ipcRenderer.invoke('save-token', token, username),
  // Window controls
  closeInputWindow: () => ipcRenderer.send('close-input-window'),
  openSettings: () => ipcRenderer.send('open-settings'),
  exitApp: () => ipcRenderer.send('exit-app'),
  openVisualizations: () => ipcRenderer.send('open-visualizations'),
  // Data fetching
  getFollowers: (token, username) => ipcRenderer.invoke('get-followers', token, username),
  getFollowing: (token, username) => ipcRenderer.invoke('get-following', token, username),
  getUserDetails: (token, username) => ipcRenderer.invoke('get-user-details', token, username),
  // Unfollowers
  getUnfollowers: () => ipcRenderer.invoke('get-unfollowers'),
  getUnfollowersCount: () => ipcRenderer.invoke('get-unfollowers-count'),
  // Follow/unfollow actions
  followUser: (token, username) => ipcRenderer.invoke('follow-user', token, username),
  unfollowUser: (token, username) => ipcRenderer.invoke('unfollow-user', token, username),
  // Followers storage
  storeFollowers: (followers, username) => ipcRenderer.invoke('store-followers', followers, username),
  getPreviousFollowers: (username) => ipcRenderer.invoke('get-previous-followers', username),
  // Settings
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (newSettings) => ipcRenderer.invoke('save-settings', newSettings),
  // Theme updates
  onUpdateTheme: (callback) => ipcRenderer.on('update-theme', callback),
  // External links
  openExternalLink: (url) => shell.openExternal(url),
});
