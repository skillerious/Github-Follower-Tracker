const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const tokenFile = path.join(__dirname, 'token.json');
const followersFile = path.join(__dirname, 'followers.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Automatically check for unfollowers every 5 minutes (300,000 milliseconds)
let intervalId;
app.whenReady().then(() => {
  intervalId = setInterval(() => {
    checkForUnfollowers();
  }, 300000); // 5 minutes
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    clearInterval(intervalId); // Clear the interval when the app closes
    app.quit();
  }
});

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
      }
    }

    // Save the current followers list for future comparisons
    fs.writeFileSync(followersFile, JSON.stringify({ followers, lastChecked: new Date() }));
  } catch (error) {
    console.error("Error checking for unfollowers:", error);
  }
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
  unfollowers.forEach(unfollower => {
    new Notification({
      title: 'Unfollower Detected!',
      body: `${unfollower.login} has unfollowed you.`,
      icon: unfollower.avatar_url // Show avatar if available
    }).show();
  });
}

// Follow a GitHub user
ipcMain.handle('follow-user', async (event, token, username) => {
  try {
    await axios.put(`https://api.github.com/user/following/${username}`, {}, {
      headers: { Authorization: `token ${token}` }
    });
    return { success: true };
  } catch (error) {
    console.error('Error following user:', error);
    return { success: false, error };
  }
});

// Unfollow a GitHub user
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

// Read token and username from file or return null if not found or invalid
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

// Save token and username to file
ipcMain.handle('save-token', async (event, token, username) => {
  fs.writeFileSync(tokenFile, JSON.stringify({ token, username }));
});

// Fetch GitHub followers
ipcMain.handle('get-followers', async (event, token, username) => {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/followers`, {
      headers: { Authorization: `token ${token}` }
    });
    return response.data;  // Return full follower objects
  } catch (error) {
    console.error("Error fetching followers:", error);
    return [];
  }
});

// Fetch GitHub following
ipcMain.handle('get-following', async (event, token, username) => {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/following`, {
      headers: { Authorization: `token ${token}` }
    });
    return response.data;  // Return full following objects
  } catch (error) {
    console.error("Error fetching following:", error);
    return [];
  }
});

// Handle exit event from the renderer process
ipcMain.on('exit-app', () => {
  app.quit();
});

// Store current followers and compare with the previous list to find unfollowers
ipcMain.handle('store-followers', async (event, followers) => {
  let previousFollowers = [];
  if (fs.existsSync(followersFile)) {
    const data = JSON.parse(fs.readFileSync(followersFile));
    previousFollowers = data.followers || [];
  }

  // Store new followers in file
  fs.writeFileSync(followersFile, JSON.stringify({ followers, lastChecked: new Date() }));

  // Compare current followers with previous followers
  const unfollowers = previousFollowers.filter(prevFollower =>
    !followers.some(currentFollower => currentFollower.login === prevFollower.login)
  );

  // Send a notification if there are unfollowers
  if (unfollowers.length > 0) {
    notifyUnfollowers(unfollowers);
  }
});

// Compare previous and current followers
ipcMain.handle('compare-followers', async () => {
  if (!fs.existsSync(followersFile)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(followersFile));
  return data.followers;
});

// Handler to retrieve previous followers from JSON (Create the file if it doesn't exist)
ipcMain.handle('get-previous-followers', (event, username) => {
  const followersFile = path.join(__dirname, `${username}_followers.json`);
  
  // Check if the file exists
  if (fs.existsSync(followersFile)) {
    return JSON.parse(fs.readFileSync(followersFile, 'utf8')); // Return previous followers
  } else {
    // If the file doesn't exist, create an empty JSON file
    fs.writeFileSync(followersFile, JSON.stringify([])); 
    return []; // Return an empty array as there are no previous followers
  }
});

// Function to send Windows notification for unfollowers
function notifyUnfollowers(unfollowers) {
  unfollowers.forEach(unfollower => {
    new Notification({
      title: 'Unfollower Detected!',
      body: `${unfollower.login} has unfollowed you.`,
      icon: unfollower.avatar_url // Show avatar if available
    }).show();
  });
}
