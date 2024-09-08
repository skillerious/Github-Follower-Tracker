const { ipcRenderer } = require('electron');

// Initialize and fetch token data on load
window.onload = async () => {
  try {
    let tokenData = await ipcRenderer.invoke('check-token');

    if (!tokenData) {
      const modal = document.getElementById('input-modal');
      modal.style.display = 'block'; 
      
      document.getElementById('save-credentials').addEventListener('click', async () => {
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
    } else {
      fetchGitHubData(tokenData.token, tokenData.username);
    }

    // Fetch GitHub followers data every 5 minutes
    setInterval(() => {
      fetchGitHubData(tokenData.token, tokenData.username);
    }, 5 * 60 * 1000); // 5 minutes

    // Toolbar button actions
    document.getElementById('refresh-btn').addEventListener('click', () => {
      fetchGitHubData(tokenData.token, tokenData.username);
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      ipcRenderer.send('open-settings');  // Open the settings window
    });

    document.getElementById('exit-btn').addEventListener('click', () => {
      ipcRenderer.send('exit-app');
    });

    // Event Listener for Visualize Data Button
    document.getElementById('visualize-btn').addEventListener('click', () => {
      ipcRenderer.send('open-visualizations');
    });
    
    // Add listeners for theme and accent color updates
    ipcRenderer.on('update-theme', (event, theme, accentColor) => {
      applyTheme(theme, accentColor);
    });

    // Return to Top functionality
    const returnToTopBtn = document.getElementById('return-to-top');
    const contentDiv = document.querySelector('.content');
    const toolbar = document.getElementById('toolbar');

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

    // Fetch unfollowers and display in the table
    fetchUnfollowers();

  } catch (error) {
    console.error('Error in renderer.js:', error);
    alert('An error occurred. Please check the console for more details.');
  }
};

// Function to fetch unfollowers and update the table
async function fetchUnfollowers() {
  try {
    const unfollowers = await ipcRenderer.invoke('get-unfollowers');

    const unfollowerTable = document.getElementById('unfollowers-list').getElementsByTagName('tbody')[0];
    unfollowerTable.innerHTML = '';  // Clear the table content

    unfollowers.forEach(unfollower => {
      const row = unfollowerTable.insertRow();
      
      const avatarCell = row.insertCell(0);
      const avatar = document.createElement('img');
      avatar.src = unfollower.avatar_url || ''; 
      avatar.alt = unfollower.login || 'No username';
      avatar.classList.add('avatar');
      avatarCell.appendChild(avatar);
      
      const nameCell = row.insertCell(1);
      nameCell.innerText = unfollower.login || 'No username';

      const profileCell = row.insertCell(2);
      const profileButton = document.createElement('button');
      profileButton.classList.add('profile-btn');
      profileButton.innerText = 'View Profile';
      profileButton.onclick = () => {
        window.open(unfollower.html_url, '_blank');
      };
      profileCell.appendChild(profileButton);
    });

  } catch (error) {
    console.error('Error fetching unfollowers:', error);
  }
}

// Function to apply theme and accent color
function applyTheme(theme, accentColor) {
  document.body.className = theme; // Apply theme class to body
  document.documentElement.style.setProperty('--accent-color', accentColor); // Apply accent color
}

// Function to fetch followers and following data and update the statistics panel
async function fetchGitHubData(token, username) {
  try {
    const [followers, following, userDetails] = await Promise.all([
      ipcRenderer.invoke('get-followers', token, username),
      ipcRenderer.invoke('get-following', token, username),
      ipcRenderer.invoke('get-user-details', token, username)
    ]);

    if (!followers || !following || !userDetails) {
      throw new Error("Failed to fetch followers, following, or user details.");
    }

    // Update the profile badge with the user's actual profile picture and username
    document.getElementById('profile-pic').src = userDetails.avatar_url;
    document.getElementById('username').innerText = userDetails.login;

    // Update the statistics in the sidebar
    document.getElementById('total-followers').innerText = followers.length;
    document.getElementById('total-following').innerText = following.length;
    document.getElementById('public-repos').innerText = userDetails.public_repos;
    document.getElementById('stars-received').innerText = userDetails.total_stars;
    document.getElementById('account-created').innerText = new Date(userDetails.created_at).toLocaleDateString();

    populateTable(followers, following, token);
    detectUnfollowers(token, username, followers); // Call to detect unfollowers
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
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
          if (unfollower.login) { // Ensure the unfollower has a valid login
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
