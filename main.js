const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

let mainWindow;
let inputWindow;
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

// Ensure required files exist
if (!fs.existsSync(unfollowersFile)) {
  fs.writeFileSync(unfollowersFile, JSON.stringify({ unfollowers: [], lastChecked: new Date().toISOString() }, null, 2));
}
if (!fs.existsSync(followersGrowthFile)) {
  fs.writeFileSync(followersGrowthFile, JSON.stringify({ data: [] }, null, 2));
}
if (!fs.existsSync(starsGrowthFile)) {
  fs.writeFileSync(starsGrowthFile, JSON.stringify({ data: [] }, null, 2));
}

// Load or save settings
function loadSettings() {
  if (!fs.existsSync(settingsFile)) {
    return {
      refreshInterval: 5,
      notificationsEnabled: true,
      launchOnStartup: false,
      closeToTray: true,
      theme: 'dark',
      accentColor: '#61dafb'
    };
  }
  const data = fs.readFileSync(settingsFile, 'utf-8');
  return JSON.parse(data);
}

function saveSettings(settings) {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function applySettings() {
  const settings = loadSettings();

  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(() => {
    checkForUnfollowers();
  }, settings.refreshInterval * 60 * 1000);

  if (settings.notificationsEnabled) {
    mainWindow.webContents.send('enable-notifications');
  } else {
    mainWindow.webContents.send('disable-notifications');
  }

  mainWindow.webContents.send('update-theme', settings.theme, settings.accentColor);

  mainWindow.removeAllListeners('close');
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && settings.closeToTray) {
      event.preventDefault();
      mainWindow.hide(); // Hide the window instead of closing
      createTray(); // Ensure tray is created when the window is hidden
    } else {
      app.isQuitting = true;
      app.quit();
    }
  });

  setInterval(() => {
    trackFollowersGrowth();
    trackMonthlyStarGrowth();
  }, 24 * 60 * 60 * 1000);
}


// Function to read unfollowers from JSON file
function getUnfollowersCount() {
  try {
    if (fs.existsSync(unfollowersFile)) {
      const data = JSON.parse(fs.readFileSync(unfollowersFile, 'utf-8'));
      return data.unfollowers ? data.unfollowers.length : 0;
    }
    return 0;
  } catch (error) {
    console.error('Error reading unfollowers.json:', error);
    return 0;
  }
}

// Create main window
function createMainWindow() {
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
  mainWindow.maximize();

  // Apply settings once the window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    applySettings();
  });
}

function createVisualizationsWindow() {
  visualizationsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  visualizationsWindow.loadFile('visualizations.html'); // Make sure this file exists

  visualizationsWindow.on('closed', () => {
    visualizationsWindow = null;
  });
}


// Create input window
function createInputWindow() {
  inputWindow = new BrowserWindow({
    width: 400,
    height: 665,
    frame: false,
    resizable: false, // Prevents resizing
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  inputWindow.loadFile('input.html');

  inputWindow.on('closed', () => {
    inputWindow = null;
  });
}

// Check if token exists and is valid
function isTokenValid() {
  if (!fs.existsSync(tokenFile)) return false;
  const data = fs.readFileSync(tokenFile, 'utf-8');
  try {
    const parsedData = JSON.parse(data);
    return parsedData.token && parsedData.username;
  } catch {
    return false;
  }
}

// When the app is ready
app.whenReady().then(() => {
  if (isTokenValid()) {
    createMainWindow();
    
    // Check followers growth and calculate gain/loss on app startup
    trackFollowersGrowth();

  } else {
    createInputWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      isTokenValid() ? createMainWindow() : createInputWindow();
    }
  });

  // Ensure the tray icon is created when the app is ready
  createTray();
});



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    clearInterval(intervalId);
    app.quit();
  }
});

// IPC handlers
ipcMain.on('close-input-window', () => {
  inputWindow.close();
  createMainWindow();
});


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

// IPC handler to send unfollowers count to renderer process
ipcMain.handle('get-unfollowers-count', (event) => {
  return getUnfollowersCount();
});

ipcMain.on('go-home', () => {
  if (mainWindow) {
    mainWindow.show();
    if (visualizationsWindow) visualizationsWindow.close();
  }
});

// Create tray icon and menu
function createTray() {
  if (!tray) {
    tray = new Tray(path.join(__dirname, 'icon.png')); // Make sure the path to your icon is correct

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => { 
          if (mainWindow) {
            mainWindow.show(); 
          }
        } 
      },
      { label: 'Exit', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]);

    tray.setToolTip('GitHub Follower Checker');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
      }
    });
  }
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

// Add function to track followers growth
async function trackFollowersGrowth() {
  const tokenData = getTokenData();
  if (!tokenData) {
    console.log('Token data is missing or invalid.');
    return;
  }

  try {
    // Fetch the current list of followers
    const followers = await getFollowers(tokenData.token, tokenData.username);

    // Read existing follower growth data from the JSON file
    let followersGrowth = JSON.parse(fs.readFileSync(followersGrowthFile, 'utf-8'));

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Check if an entry for today's date already exists
    const todayEntry = followersGrowth.data.find(entry => entry.date === today);

    if (todayEntry) {
      todayEntry.count = followers.length; // Update today's count
    } else {
      followersGrowth.data.push({ date: today, count: followers.length }); // Add a new entry for today
    }

    // Save updated data back to the JSON file
    fs.writeFileSync(followersGrowthFile, JSON.stringify(followersGrowth, null, 2));
    console.log(`Followers growth updated for ${today}: ${followers.length} followers.`);

    // Calculate follower gain/loss after updating growth data
    const gainLossData = calculateFollowerGainLoss(followersGrowth);
    console.log('Follower gain/loss calculated:', gainLossData); // Log the gain/loss data for verification

  } catch (error) {
    console.error("Error tracking followers growth:", error);
  }
}

// Function to track monthly star growth
async function trackMonthlyStarGrowth() {
  const tokenData = getTokenData();
  if (!tokenData) return;

  try {
    const reposResponse = await axios.get(`https://api.github.com/users/${tokenData.username}/repos`, {
      headers: { Authorization: `token ${tokenData.token}` }
    });

    const repositories = reposResponse.data;

    // Calculate total stars
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    // Read existing data
    let starsGrowth = JSON.parse(fs.readFileSync(starsGrowthFile, 'utf-8'));

    // Get current month
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Find existing entry for the current month
    const monthEntry = starsGrowth.data.find(entry => entry.month === currentMonth);

    if (monthEntry) {
      monthEntry.count = totalStars; // Update the count
    } else {
      starsGrowth.data.push({ month: currentMonth, count: totalStars }); // Add a new entry
    }

    // Save updated data
    fs.writeFileSync(starsGrowthFile, JSON.stringify(starsGrowth, null, 2));
  } catch (error) {
    console.error("Error tracking star growth:", error);
  }
}

// Schedule this to run daily
setInterval(trackMonthlyStarGrowth, 24 * 60 * 60 * 1000); // Every 24 hours


// Store unfollowers to the file
function storeUnfollowers(unfollowers) {
  const data = { unfollowers, lastChecked: new Date() };
  fs.writeFileSync(unfollowersFile, JSON.stringify(data, null, 2)); // Ensure correct format and spacing
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

// Helper function to fetch all pages of followers
async function getFollowers(token, username) {
  let followers = [];
  let page = 1;
  let perPage = 100; // Number of followers per page
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}/followers`, {
        headers: { Authorization: `token ${token}` },
        params: { per_page: perPage, page }
      });
      
      followers = followers.concat(response.data);
      

      if (response.data.length < perPage) {
        hasMore = false; // No more pages
      } else {
        page++; // Increment page number for next request
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
      break;
    }
  }

  return followers;
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

// IPC handler to get visualization data
ipcMain.handle('get-visualization-data', async () => {
  try {
    const tokenData = getTokenData();
    if (!tokenData) return {};

    const followers = await getFollowers(tokenData.token, tokenData.username);
    const following = await getFollowing(tokenData.token, tokenData.username);
    const topReposByStars = await getTopRepositoriesByStars(tokenData.token, tokenData.username);

    const followersGrowth = JSON.parse(fs.readFileSync(followersGrowthFile, 'utf-8'));
    const starsGrowth = JSON.parse(fs.readFileSync(starsGrowthFile, 'utf-8'));

    const followerGainLoss = calculateFollowerGainLoss(followersGrowth);
    const topStarredReposOverTime = await getTopStarredReposOverTime(tokenData.token, tokenData.username);
    const mostActiveDays = await calculateMostActiveDays(tokenData.token, tokenData.username);
    const languagesUsed = await getLanguagesUsed(tokenData.token, tokenData.username);

    const data = {
      followersGrowth: followersGrowth.data,
      followers: followers.length,
      following: following.length,
      topRepos: topReposByStars,
      monthlyStars: starsGrowth.data,
      followerGainLoss: followerGainLoss,
      topStarredReposOverTime: topStarredReposOverTime,
      mostActiveDays: mostActiveDays,
      languagesUsed: languagesUsed
    };

    return data;
  } catch (error) {
    console.error("Error fetching visualization data:", error);
    return {};
  }
});


// Helper functions for new graphs
async function getTopStarredReposOverTime(token, username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repos = response.data;
    const starredRepos = repos.filter(repo => repo.stargazers_count > 0);
    const sortedRepos = starredRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    const topRepos = sortedRepos.slice(0, 5);

    const topStarredReposOverTime = topRepos.map(repo => ({
      name: repo.name,
      stars: repo.stargazers_count,
      date: repo.created_at.split('T')[0] // Assuming date is creation date for simplicity
    }));

    return topStarredReposOverTime;
  } catch (error) {
    console.error('Error fetching top starred repos over time:', error);
    return [];
  }
}


async function calculateMostActiveDays(token, username) {
  try {
    const eventsResponse = await axios.get(`https://api.github.com/users/${username}/events`, {
      headers: { Authorization: `token ${token}` }
    });

    const events = eventsResponse.data;
    const activityCount = {};

    events.forEach(event => {
      const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long' });
      activityCount[day] = (activityCount[day] || 0) + 1;
    });

    const mostActiveDays = Object.keys(activityCount).map(day => ({
      day: day,
      count: activityCount[day]
    }));

    return mostActiveDays.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error calculating most active days:', error);
    return [];
  }
}


async function getLanguagesUsed(token, username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repos = response.data;
    const languageCount = {};

    repos.forEach(repo => {
      const language = repo.language;
      if (language) {
        languageCount[language] = (languageCount[language] || 0) + 1;
      }
    });

    const languagesUsed = Object.keys(languageCount).map(language => ({
      language: language,
      count: languageCount[language]
    }));

    return languagesUsed.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error fetching languages used:', error);
    return [];
  }
}


// Function to calculate follower gain/loss from the followers growth data
function calculateFollowerGainLoss(followersGrowth) {
  const gainLossData = [];

  if (!followersGrowth.data || followersGrowth.data.length < 2) {
    console.log('Not enough data to calculate gain/loss.');
    return gainLossData;
  }

  // Compare each day's count with the previous day to calculate the gain/loss
  for (let i = 1; i < followersGrowth.data.length; i++) {
    const previousEntry = followersGrowth.data[i - 1];
    const currentEntry = followersGrowth.data[i];
    const gainLoss = currentEntry.count - previousEntry.count;

    gainLossData.push({
      date: currentEntry.date,
      count: gainLoss
    });

    console.log(`Gain/Loss for ${currentEntry.date}: ${gainLoss}`);
  }

  return gainLossData;
}


// Function to fetch repositories and sort them by stars
async function getTopRepositoriesByStars(token, username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repositories = response.data;

    const sortedRepos = repositories.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const topRepos = sortedRepos.slice(0, 5);

    const data = {
      labels: topRepos.map(repo => repo.name),
      data: topRepos.map(repo => repo.stargazers_count)
    };

    return data;
  } catch (error) {
    console.error("Error fetching top repositories by stars:", error);
    return { labels: [], data: [] };
  }
}

// Helper function to fetch all pages of following
async function getFollowing(token, username) {
  let following = [];
  let page = 1;
  let perPage = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}/following`, {
        headers: { Authorization: `token ${token}` },
        params: { per_page: perPage, page }
      });

      following = following.concat(response.data);
      

      if (response.data.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error("Error fetching following:", error);
      break;
    }
  }

  return following;
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
    const response = await axios.delete(
      `https://api.github.com/user/following/${username}`,
      {
        headers: { Authorization: `token ${token}` },
      }
    );
    console.log('Unfollow user response:', response.status, response.data);
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing user:', error.response ? error.response.data : error.message);
    return { success: false, error };
  }
});

ipcMain.handle('follow-user', async (event, token, username) => {
  try {
    const response = await axios.put(
      `https://api.github.com/user/following/${username}`,
      {},
      {
        headers: {
          Authorization: `token ${token}`,
          'Content-Length': 0,
        },
      }
    );
    console.log('Follow user response:', response.status, response.data);
    return { success: true };
  } catch (error) {
    console.error('Error following user:', error.response ? error.response.data : error.message);
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
    const followers = await getFollowers(token, username);
    return followers;
  } catch (error) {
    console.error("Error fetching followers:", error);
    return [];
  }
});

ipcMain.handle('get-following', async (event, token, username) => {
  try {
    const following = await getFollowing(token, username);
    console.log('Following data:', following);
    return following;
  } catch (error) {
    console.error("Error fetching following:", error);
    return [];
  }
});

ipcMain.handle('get-user-details', async (event, token, username) => {
  try {
    const userResponse = await axios.get(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${token}` }
    });

    const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `token ${token}` }
    });

    const repositories = reposResponse.data;

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
    storeUnfollowers(unfollowers);
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
  applySettings();
});
