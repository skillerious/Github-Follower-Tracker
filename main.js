const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

let mainWindow;
let tray = null;
let settingsWindow = null;
let visualizationsWindow = null; // Window variable for Visualizations
let intervalId;

const tokenFile = path.join(__dirname, 'token.json');
const followersFile = path.join(__dirname, 'followers.json');
const unfollowersFile = path.join(__dirname, 'unfollowers.json'); // New file for unfollowers
const settingsFile = path.join(__dirname, 'settings.json');
const followersGrowthFile = path.join(__dirname, 'followers_growth.json');
const starsGrowthFile = path.join(__dirname, 'monthly_stars_growth.json');

// Ensure unfollowers.json exists
if (!fs.existsSync(unfollowersFile)) {
  fs.writeFileSync(unfollowersFile, JSON.stringify({ unfollowers: [], lastChecked: new Date().toISOString() }, null, 2));
}

// Ensure followers_growth.json exists
if (!fs.existsSync(followersGrowthFile)) {
  fs.writeFileSync(followersGrowthFile, JSON.stringify({ data: [] }, null, 2));
}

// Ensure monthly_stars_growth.json exists
if (!fs.existsSync(starsGrowthFile)) {
  fs.writeFileSync(starsGrowthFile, JSON.stringify({ data: [] }, null, 2));
}

// Load settings or return default settings
function loadSettings() {
  if (!fs.existsSync(settingsFile)) {
    return {
      refreshInterval: 5, // Default to 5 minutes
      notificationsEnabled: true,
      launchOnStartup: false,
      closeToTray: true, // Default value for "Close to Tray"
      theme: 'dark',
      accentColor: '#61dafb'
    };
  }
  const data = fs.readFileSync(settingsFile, 'utf-8');
  return JSON.parse(data);
}

// Save settings to settings.json
function saveSettings(settings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

// Apply settings dynamically
function applySettings() {
  const settings = loadSettings();

  // Apply refresh interval
  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(() => {
    checkForUnfollowers();
  }, settings.refreshInterval * 60 * 1000);

  // Apply notifications and theme settings
  if (settings.notificationsEnabled) {
    mainWindow.webContents.send('enable-notifications');
  } else {
    mainWindow.webContents.send('disable-notifications');
  }

  // Apply theme and accent color
  mainWindow.webContents.send('update-theme', settings.theme, settings.accentColor);

  // Apply "Close to Tray" setting dynamically
  mainWindow.removeAllListeners('close');
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && settings.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    } else {
      app.isQuitting = true;
      app.quit();
    }
  });

  // **Add the tracking interval here:**
  setInterval(() => {
    trackFollowersGrowth();
    trackMonthlyStarGrowth();
  }, 24 * 60 * 60 * 1000); // 24 hours
}


// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');

  // Maximize the window after creation
  mainWindow.maximize();

  // Apply settings once the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    applySettings(); // Apply settings to the UI when window loads
  });
}

// Function to create the visualizations window
function createVisualizationsWindow() {
  visualizationsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  visualizationsWindow.loadFile('visualizations.html');

  visualizationsWindow.on('closed', () => {
    visualizationsWindow = null;
  });
}

// Create settings window
ipcMain.on('open-settings', () => {
  if (!settingsWindow) {
    settingsWindow = new BrowserWindow({
      width: 500,
      height: 600,
      modal: true,
      parent: mainWindow,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    settingsWindow.loadFile('settings.html');

    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });
  }
});

// IPC handler to open the visualizations window
ipcMain.on('open-visualizations', () => {
  if (!visualizationsWindow) {
    createVisualizationsWindow();
  } else {
    visualizationsWindow.focus();
  }
});

ipcMain.on('go-home', () => {
  if (mainWindow) {
    mainWindow.show(); // Bring the main window to focus
    if (visualizationsWindow) visualizationsWindow.close(); // Close the visualizations window if open
  }
});


app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    clearInterval(intervalId);
    app.quit();
  }
});

// Create tray icon and menu
function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { mainWindow.show(); } },
    { label: 'Exit', click: () => {
      app.isQuitting = true;
      app.quit();
    }},
  ]);

  tray.setToolTip('GitHub Follower Checker');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

// Check for unfollowers
async function checkForUnfollowers() {
  const tokenData = getTokenData();

  if (!tokenData) return;

  try {
    const followers = await getFollowers(tokenData.token, tokenData.username);

    if (fs.existsSync(followersFile)) {
      const previousFollowers = JSON.parse(fs.readFileSync(followersFile)).followers || [];
      const unfollowers = previousFollowers.filter(prevFollower =>
        !followers.some(currentFollower => currentFollower.login === prevFollower.login)
      );

      if (unfollowers.length > 0) {
        notifyUnfollowers(unfollowers);
        storeUnfollowers(unfollowers);  // Store unfollowers to the file
      }
    }

    fs.writeFileSync(followersFile, JSON.stringify({ followers, lastChecked: new Date() }));
  } catch (error) {
    console.error("Error checking for unfollowers:", error);
  }
}

// Function to track followers growth
async function trackFollowersGrowth() {
  const tokenData = getTokenData();
  if (!tokenData) return;

  try {
    const followers = await getFollowers(tokenData.token, tokenData.username);

    // Load the existing growth data
    let followersGrowth = JSON.parse(fs.readFileSync(followersGrowthFile, 'utf-8'));

    // Check if there's already an entry for today
    const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
    const todayEntry = followersGrowth.data.find(entry => entry.date === today);

    if (todayEntry) {
      // Update the entry if it already exists
      todayEntry.count = followers.length;
    } else {
      // Add a new entry for today
      followersGrowth.data.push({ date: today, count: followers.length });
    }

    // Save the updated growth data
    fs.writeFileSync(followersGrowthFile, JSON.stringify(followersGrowth, null, 2));
  } catch (error) {
    console.error("Error tracking followers growth:", error);
  }
}

// Function to track monthly star growth
async function trackMonthlyStarGrowth() {
  const tokenData = getTokenData();
  if (!tokenData) return;

  try {
    // Fetch all repositories and calculate total stars
    const reposResponse = await axios.get(`https://api.github.com/users/${tokenData.username}/repos`, {
      headers: { Authorization: `token ${tokenData.token}` }
    });

    const repositories = reposResponse.data;

    // Calculate the total stars received by summing stargazers_count for each repo
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    // Load the existing growth data
    let starsGrowth = JSON.parse(fs.readFileSync(starsGrowthFile, 'utf-8'));

    // Get the current month and year
    const currentMonth = new Date().toISOString().substring(0, 7); // Format 'YYYY-MM'

    // Check if there's already an entry for the current month
    const monthEntry = starsGrowth.data.find(entry => entry.month === currentMonth);

    if (monthEntry) {
      // Update the entry if it already exists
      monthEntry.count = totalStars;
    } else {
      // Add a new entry for the current month
      starsGrowth.data.push({ month: currentMonth, count: totalStars });
    }

    // Save the updated growth data
    fs.writeFileSync(starsGrowthFile, JSON.stringify(starsGrowth, null, 2));
  } catch (error) {
    console.error("Error tracking star growth:", error);
  }
}


// Store unfollowers to the file
function storeUnfollowers(unfollowers) {
  fs.writeFileSync(unfollowersFile, JSON.stringify({ unfollowers, lastChecked: new Date() }));
}

// Helper function to get the token and username from the saved file
function getTokenData() {
  if (!fs.existsSync(tokenFile)) return null;

  const data = fs.readFileSync(tokenFile, 'utf-8');
  if (data.trim() === '') return null;

  const parsedData = JSON.parse(data);
  if (!parsedData.token || !parsedData.username) return null;

  return parsedData;
}

// Helper function to fetch followers using GitHub API
async function getFollowers(token, username) {
  const response = await axios.get(`https://api.github.com/users/${username}/followers`, {
    headers: { Authorization: `token ${token}` }
  });
  return response.data;
}

// Send notifications if unfollowers are detected
function notifyUnfollowers(unfollowers) {
  const settings = loadSettings();
  if (!settings.notificationsEnabled) return;

  unfollowers.forEach(unfollower => {
    new Notification({
      title: 'Unfollower Detected!',
      body: `${unfollower.login} has unfollowed you.`,
      icon: unfollower.avatar_url 
    }).show();
  });
}

// Other ipcMain.handle or ipcMain.on functions

ipcMain.handle('get-visualization-data', async () => {
  try {
    const tokenData = getTokenData();
    if (!tokenData) return {};

    const followers = await getFollowers(tokenData.token, tokenData.username);
    const following = await getFollowing(tokenData.token, tokenData.username);
    const topReposByStars = await getTopRepositoriesByStars(tokenData.token, tokenData.username);

    // Load growth data
    const followersGrowth = JSON.parse(fs.readFileSync(followersGrowthFile, 'utf-8'));
    const starsGrowth = JSON.parse(fs.readFileSync(starsGrowthFile, 'utf-8'));

    const data = {
      followersGrowth: followersGrowth.data,
      followers: followers.length,
      following: following.length,
      topRepos: topReposByStars,
      monthlyStars: starsGrowth.data
    };

    return data;
  } catch (error) {
    console.error("Error fetching visualization data:", error);
    return {};
  }
});

// Function to fetch repositories and sort them by stars
async function getTopRepositoriesByStars(token, username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repositories = response.data;

    // Sort repositories by stargazers_count in descending order
    const sortedRepos = repositories.sort((a, b) => b.stargazers_count - a.stargazers_count);

    // Limit to top 5 repositories (or any number you want)
    const topRepos = sortedRepos.slice(0, 5);

    // Prepare data for visualization
    const data = {
      labels: topRepos.map(repo => repo.name),
      data: topRepos.map(repo => repo.stargazers_count)
    };

    return data;
  } catch (error) {
    console.error("Error fetching top repositories by stars:", error);
    return { labels: [], data: [] }; // Return empty data on error
  }
}


// Correct function to fetch the following list
async function getFollowing(token, username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/following`, {
      headers: { Authorization: `token ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching following:", error);
    return [];
  }
}


// IPC handlers for various actions
ipcMain.handle('get-unfollowers', () => {
  if (fs.existsSync(unfollowersFile)) {
    const data = JSON.parse(fs.readFileSync(unfollowersFile, 'utf-8'));
    return data.unfollowers || [];
  }
  return [];
});


ipcMain.handle('unfollow-user', async (event, token, username) => {
  try {
    await axios.delete(`https://api.github.com/user/following/${username}`, {
      headers: { Authorization: `token ${token}` }
    });
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { success: false, error };
  }
});

ipcMain.handle('check-token', async (event) => {
  try {
    if (!fs.existsSync(tokenFile)) {
      return null;
    }

    const data = fs.readFileSync(tokenFile, 'utf-8');
    if (data.trim() === '') {
      return null;
    }

    const parsedData = JSON.parse(data);
    if (!parsedData.token || !parsedData.username) {
      return null;
    }

    return parsedData;

  } catch (error) {
    console.error("Error occurred while reading token.json:", error);
    return null;
  }
});

ipcMain.handle('save-token', async (event, token, username) => {
  fs.writeFileSync(tokenFile, JSON.stringify({ token, username }));
});

ipcMain.handle('get-followers', async (event, token, username) => {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/followers`, {
      headers: { Authorization: `token ${token}` }
    });
    return response.data;  
  } catch (error) {
    console.error("Error fetching followers:", error);
    return [];
  }
});

ipcMain.handle('get-following', async (event, token, username) => {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/following`, {
      headers: { Authorization: `token ${token}` }
    });
    return response.data;  
  } catch (error) {
    console.error("Error fetching following:", error);
    return [];
  }
});

ipcMain.handle('get-user-details', async (event, token, username) => {
  try {
    // Fetch user details
    const userResponse = await axios.get(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${token}` }
    });

    // Fetch all public repositories for the user
    const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repositories = reposResponse.data;

    // Calculate the total stars received by summing stargazers_count for each repo
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    return { ...userResponse.data, total_stars: totalStars };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {};
  }
});

ipcMain.handle('store-followers', async (event, followers, username) => {
  let previousFollowers = [];
  const followersFile = path.join(__dirname, `${username}_followers.json`);
  if (fs.existsSync(followersFile)) {
    const data = JSON.parse(fs.readFileSync(followersFile));
    previousFollowers = data.followers || [];
  }

  fs.writeFileSync(followersFile, JSON.stringify({ followers, lastChecked: new Date() }));

  const unfollowers = previousFollowers.filter(prevFollower =>
    !followers.some(currentFollower => currentFollower.login === prevFollower.login)
  );

  if (unfollowers.length > 0) {
    notifyUnfollowers(unfollowers);
  }
});

ipcMain.handle('get-previous-followers', (event, username) => {
  const followersFile = path.join(__dirname, `${username}_followers.json`);
  
  if (fs.existsSync(followersFile)) {
    return JSON.parse(fs.readFileSync(followersFile)).followers;
  } else {
    fs.writeFileSync(followersFile, JSON.stringify([]));
    return [];
  }
});

ipcMain.on('exit-app', () => {
  app.quit();
});

ipcMain.handle('load-settings', async () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, newSettings) => {
  const settings = loadSettings();
  const updatedSettings = { ...settings, ...newSettings };
  saveSettings(updatedSettings);
  applySettings(); // Re-apply settings after saving
});
