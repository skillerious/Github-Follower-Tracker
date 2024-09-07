const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    let tokenData = await ipcRenderer.invoke('check-token');

    if (!tokenData) {
      const modal = document.getElementById('input-modal');
      if (modal) {
        modal.style.display = 'block';

        const saveCredentialsBtn = document.getElementById('save-credentials');
        if (saveCredentialsBtn) {
          saveCredentialsBtn.addEventListener('click', async () => {
            const userToken = document.getElementById('github-token').value;
            const username = document.getElementById('github-username').value;

            if (userToken && username) {
              await ipcRenderer.invoke('save-token', userToken, username);
              modal.style.display = 'none';
              tokenData = { token: userToken, username };
              fetchGitHubData(tokenData.token, tokenData.username);
            } else {
              alert("GitHub token and username are required to proceed.");
            }
          });
        }
      }
    } else {
      fetchGitHubData(tokenData.token, tokenData.username);
    }

    // Toolbar button actions
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchGitHubData(tokenData.token, tokenData.username);
      });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        ipcRenderer.send('open-settings');  // Open the settings window
      });
    }

    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        ipcRenderer.send('exit-app');
      });
    }

    // Add listeners for theme and accent color updates
    ipcRenderer.on('update-theme', (event, theme, accentColor) => {
      applyTheme(theme, accentColor);
    });

    // Return to Top functionality
    const returnToTopBtn = document.getElementById('return-to-top');
    const contentDiv = document.querySelector('.content');
    const toolbar = document.getElementById('toolbar');

    if (contentDiv && returnToTopBtn && toolbar) {
      contentDiv.addEventListener('scroll', () => {
        const halfwayPoint = contentDiv.scrollHeight / 2;
        const scrollTop = contentDiv.scrollTop;

        // Show the "Return to Top" button when scrolling halfway
        if (scrollTop > halfwayPoint) {
          returnToTopBtn.style.display = 'flex';
        } else {
          returnToTopBtn.style.display = 'none';
        }

        // Hide toolbar when scrolled down and show when at the top
        if (scrollTop > 100) {
          toolbar.classList.add('hidden');
        } else {
          toolbar.classList.remove('hidden');
        }
      });

      // Scroll back to top when Return to Top button is clicked
      returnToTopBtn.addEventListener('click', () => {
        contentDiv.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

    // Fetch GitHub followers data every 5 minutes
    setInterval(() => {
      fetchGitHubData(tokenData.token, tokenData.username);
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    console.error('Error in renderer.js:', error);
    alert('An error occurred. Please check the console for more details.');
  }
});

// Function to apply theme and accent color
function applyTheme(theme, accentColor) {
  document.body.className = theme; // Apply theme class to body
  document.documentElement.style.setProperty('--accent-color', accentColor); // Apply accent color
}

// Function to fetch followers, following data, and other GitHub stats
async function fetchGitHubData(token, username) {
  try {
    const [followers, following, repos] = await Promise.all([
      ipcRenderer.invoke('get-followers', token, username),
      ipcRenderer.invoke('get-following', token, username),
      fetchRepos(token, username)
    ]);

    // Only display the number without the label
    document.getElementById('total-followers').innerText = followers.length; // Display only the number
    document.getElementById('total-following').innerText = following.length; // Display only the number
    document.getElementById('total-repos').innerText = repos.length; // Total number of repositories
    document.getElementById('total-stars').innerText = getTotalStars(repos); // Total stars count
    document.getElementById('total-forks').innerText = getTotalForks(repos); // Total forks count
    document.getElementById('latest-repo').innerText = getLatestRepo(repos); // Latest repository name

    populateTable(followers, following, token); // Populate table with followers/following info
    detectUnfollowers(token, username, followers); // Detect and handle unfollowers
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}


// Function to fetch repositories
async function fetchRepos(token, username) {
  const response = await fetch(`https://api.github.com/users/${username}/repos`, {
    headers: { Authorization: `token ${token}` }
  });
  return response.json();
}

// Helper functions to calculate stats
function getTotalStars(repos) {
  return repos.reduce((total, repo) => total + repo.stargazers_count, 0);
}

function getTotalForks(repos) {
  return repos.reduce((total, repo) => total + repo.forks_count, 0);
}

function getLatestRepo(repos) {
  const latestRepo = repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  return latestRepo ? latestRepo.name : 'N/A';
}

// Function to populate the table with followers, avatars, and follow/unfollow buttons
function populateTable(followers, following, token) {
  const followerTable = document.getElementById('followers-list').getElementsByTagName('tbody')[0];
  followerTable.innerHTML = ''; 

  followers.forEach(follower => {
    const row = followerTable.insertRow();
    
    const avatarCell = row.insertCell(0);
    const avatar = document.createElement('img');
    avatar.src = follower.avatar_url || ''; 
    avatar.alt = follower.login || 'No username';
    avatar.classList.add('avatar');
    avatarCell.appendChild(avatar);
    
    const nameCell = row.insertCell(1);
    nameCell.innerText = follower.login || 'No username';

    const isFollowing = following.some(f => f.login === follower.login);
    const statusCell = row.insertCell(2);
    statusCell.innerText = isFollowing ? "Yes" : "No";

    const profileCell = row.insertCell(3);
    const profileButton = document.createElement('button');
    profileButton.classList.add('profile-btn');
    profileButton.innerText = 'View Profile';
    profileButton.onclick = () => {
      window.open(follower.html_url, '_blank');
    };
    profileCell.appendChild(profileButton);

    // Action Button (Follow/Unfollow)
    const actionCell = row.insertCell(4);
    const actionButton = document.createElement('button');
    actionButton.classList.add('action-btn');
    if (isFollowing) {
      actionButton.innerText = 'Unfollow';
      actionButton.onclick = () => unfollowUser(token, follower.login, actionButton);
    } else {
      actionButton.classList.add('follow');
      actionButton.innerText = 'Follow';
      actionButton.onclick = () => followUser(token, follower.login, actionButton);
    }
    actionCell.appendChild(actionButton);
  });
}

// Function to detect unfollowers
async function detectUnfollowers(token, username, currentFollowers) {
  try {
    const previousFollowers = await ipcRenderer.invoke('get-previous-followers', username);
    
    // Store current followers
    ipcRenderer.invoke('store-followers', currentFollowers, username);

    if (previousFollowers) {
      const previousFollowerLogins = previousFollowers.map(f => f.login);
      const currentFollowerLogins = currentFollowers.map(f => f.login);

      // Detect unfollowers (in previous followers but not in current)
      const unfollowers = previousFollowers.filter(follower => !currentFollowerLogins.includes(follower.login));

      if (unfollowers.length > 0) {
        unfollowers.forEach(unfollower => {
          if (unfollower.login) {
            new Notification('Unfollower Detected!', {
              body: `${unfollower.login} has unfollowed you.`
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error detecting unfollowers:', error);
  }
}

// Function to follow a user
async function followUser(token, username, button) {
  try {
    const response = await ipcRenderer.invoke('follow-user', token, username);
    if (response.success) {
      button.innerText = 'Unfollow';
      button.classList.remove('follow');
      button.onclick = () => unfollowUser(token, username, button);
    }
  } catch (error) {
    console.error('Error following user:', error);
  }
}

// Function to unfollow a user
async function unfollowUser(token, username, button) {
  try {
    const response = await ipcRenderer.invoke('unfollow-user', token, username);
    if (response.success) {
      button.innerText = 'Follow';
      button.classList.add('follow');
      button.onclick = () => followUser(token, username, button);
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
  }
}
