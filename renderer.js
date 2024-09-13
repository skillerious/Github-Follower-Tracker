// renderer.js
const { ipcRenderer } = require('electron');
const debounce = require('lodash.debounce');

let tokenData = null;
let currentPage = 1;
const followersPerPage = 100;

let allFollowers = []; // Global variable to store all followers
let following = [];    // Global variable to store following

// Initialize and fetch token data on load
window.onload = async () => {
  try {
    tokenData = await ipcRenderer.invoke('check-token');

    if (!tokenData) {
      const modal = document.getElementById('input-modal');
      modal.style.display = 'block';

      document.getElementById('save-credentials').addEventListener('click', async () => {
        const userToken = document.getElementById('github-token').value;
        const username = document.getElementById('github-username').value;

        if (userToken && username) {
          await ipcRenderer.invoke('save-token', userToken, username);
          modal.style.display = 'none';
          ipcRenderer.send('close-input-window'); // Close input and open main window
        } else {
          alert("GitHub token and username are required to proceed.");
        }
      });
    } else {
      await fetchGitHubData(tokenData.token, tokenData.username);
    }

    // Set up periodic data fetching
    setInterval(() => {
      fetchGitHubData(tokenData.token, tokenData.username);
    }, 5 * 60 * 1000);

    // Set up event listeners for buttons
    document.getElementById('refresh-btn').addEventListener('click', () => {
      fetchGitHubData(tokenData.token, tokenData.username);
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      ipcRenderer.send('open-settings');
    });

    document.getElementById('exit-btn').addEventListener('click', () => {
      ipcRenderer.send('exit-app');
    });

    document.getElementById('visualize-btn').addEventListener('click', () => {
      ipcRenderer.send('open-visualizations');
    });

    document.getElementById('load-more-btn').addEventListener('click', () => {
      currentPage++;
      fetchGitHubData(tokenData.token, tokenData.username, currentPage);
    });

    // Listen for theme updates
    ipcRenderer.on('update-theme', (event, theme, accentColor) => {
      applyTheme(theme, accentColor);
    });

    const returnToTopBtn = document.getElementById('return-to-top');
    const contentDiv = document.querySelector('.content');
    const toolbar = document.getElementById('toolbar');

    // Scroll event for content div
    contentDiv.addEventListener('scroll', debounce(() => {
      const halfwayPoint = contentDiv.scrollHeight / 2;
      const scrollTop = contentDiv.scrollTop;

      if (scrollTop > halfwayPoint) {
        returnToTopBtn.style.display = 'flex';
      } else {
        returnToTopBtn.style.display = 'none';
      }

      if (scrollTop > 100) {
        toolbar.classList.add('hidden');
      } else {
        toolbar.classList.remove('hidden');
      }
    }, 200));

    // Return to top button
    returnToTopBtn.addEventListener('click', () => {
      contentDiv.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // Fetch initial unfollower data and update count
    fetchUnfollowers();
    updateUnfollowersCount();

    // Search bar and clear button elements
    const searchBar = document.getElementById('search-bar');
    const clearSearchBtn = document.getElementById('clear-search-btn');

  
    // Event listener for search input
    searchBar.addEventListener('input', () => {
      const searchTerm = searchBar.value.toLowerCase().trim();

      const filteredFollowers = allFollowers.filter(follower =>
        follower.login.toLowerCase().includes(searchTerm)
      );
      populateTable(filteredFollowers, following, tokenData.token);
    });

    // Event listener for clear search button
    clearSearchBtn.addEventListener('click', () => {
      searchBar.value = ''; // Clear the search field
      populateTable(allFollowers, following, tokenData.token); // Reset the followers list
      searchBar.focus(); //
    });
    

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
    unfollowerTable.innerHTML = ''; // Clear the table content

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

// Function to update unfollower count in the sidebar
async function updateUnfollowersCount() {
  try {
    const count = await ipcRenderer.invoke('get-unfollowers-count');
    document.getElementById('unfollowers-count').innerText = count;
  } catch (error) {
    console.error('Error updating unfollowers count:', error);
  }
}

// Function to fetch followers and following data and update the statistics panel
async function fetchGitHubData(token, username, page = 1) {
  try {
    console.log('Fetching GitHub data for user:', username, 'Page:', page);

    // Ensure tokenData is available and matches the logged-in user
    if (!tokenData || tokenData.username.toLowerCase() !== username.toLowerCase()) {
      console.error('Token data does not match the logged-in user.');
      return;
    }

    // Fetch followers, following, and user details
    const [followers, followingData, userDetails] = await Promise.all([
      ipcRenderer.invoke('get-followers', token, username, page, followersPerPage),
      ipcRenderer.invoke('get-following', token, username),
      ipcRenderer.invoke('get-user-details', token, username),
    ]);

    console.log('Followers fetched:', followers);
    console.log('Following fetched:', followingData);
    console.log('User details fetched:', userDetails);

    if (!followers || !followingData || !userDetails) {
      throw new Error("Failed to fetch followers, following, or user details.");
    }

    // Store the fetched data globally
    allFollowers = followers;
    following = followingData;

    // Update UI with the logged-in user's information
    document.getElementById('profile-pic').src = userDetails.avatar_url;
    document.getElementById('username').innerText = userDetails.login;

    document.getElementById('total-followers').innerText = followers.length;
    document.getElementById('total-following').innerText = following.length;
    document.getElementById('public-repos').innerText = userDetails.public_repos;
    document.getElementById('stars-received').innerText = userDetails.total_stars;
    document.getElementById('account-created').innerText = new Date(userDetails.created_at).toLocaleDateString();

    // Populate the table with the followers
    populateTable(allFollowers, following, token);

    detectUnfollowers(token, username, followers);
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}

// Function to populate the table with followers, avatars, and follow/unfollow buttons
function populateTable(followers, following, token) {
  const followerTable = document.getElementById('followers-list').getElementsByTagName('tbody')[0];
  followerTable.innerHTML = '';

  console.log('Followers to display:', followers);

  followers.forEach(follower => {
    // Display followers in the table
    const row = followerTable.insertRow();

    const avatarCell = row.insertCell(0);
    const avatar = document.createElement('img');
    avatar.src = follower.avatar_url || '';
    avatar.alt = follower.login || 'No username';
    avatar.classList.add('avatar');
    avatarCell.appendChild(avatar);

    const nameCell = row.insertCell(1);
    nameCell.innerText = follower.login || 'No username';

    const isFollowing = following.some(f => f.login.toLowerCase() === follower.login.toLowerCase());

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

    const actionCell = row.insertCell(4);
    const actionButton = document.createElement('button');
    actionButton.classList.add('action-btn');
    if (isFollowing) {
      actionButton.innerText = 'Unfollow';
      actionButton.onclick = () => {
        console.log(`Attempting to unfollow ${follower.login}`);
        unfollowUser(token, follower.login, actionButton);
      };
    } else {
      actionButton.classList.add('follow');
      actionButton.innerText = 'Follow';
      actionButton.onclick = () => {
        console.log(`Attempting to follow ${follower.login}`);
        followUser(token, follower.login, actionButton);
      };
    }
    actionCell.appendChild(actionButton);
  });
}

// Function to detect unfollowers and automatically unfollow them if you're following them
async function detectUnfollowers(token, username, currentFollowers) {
  try {
    const previousFollowers = await ipcRenderer.invoke('get-previous-followers', username);

    // Store the current followers for future comparisons
    ipcRenderer.invoke('store-followers', currentFollowers, username);

    if (previousFollowers) {
      const previousFollowerLogins = previousFollowers.map(f => f.login);
      const currentFollowerLogins = currentFollowers.map(f => f.login);

      // Detect unfollowers
      const unfollowers = previousFollowers.filter(follower => !currentFollowerLogins.includes(follower.login));

      if (unfollowers.length > 0) {
        unfollowers.forEach(async (unfollower) => {
          if (unfollower.login) {
            // Refined notification for unfollower
            new Notification('Unfollower Detected', {
              body: `${unfollower.login} has unfollowed you.`,
              icon: unfollower.avatar_url || '', // Use the unfollower's avatar for a personal touch
              silent: true, // Make the notification silent to avoid interrupting the user
            });

            // Check if you're following the unfollower and automatically unfollow them
            const isFollowing = following.some(f => f.login.toLowerCase() === unfollower.login.toLowerCase());

            if (isFollowing) {
              console.log(`You are still following ${unfollower.login}, unfollowing them now.`);
              await unfollowUser(token, unfollower.login); // Automatically unfollow them

              // Refined notification for successful automatic unfollow
              new Notification('Automatic Unfollow', {
                body: `You have automatically unfollowed ${unfollower.login}.`,
                icon: unfollower.avatar_url || '', // Include the unfollower's avatar
                silent: true, // Silent notification to avoid disruption
              });
            }
          }
        });

        // Update the UI with the new unfollowers
        fetchUnfollowers();
      }
    }
  } catch (error) {
    console.error('Error detecting unfollowers:', error);
  }
}

// Function to follow a user
async function followUser(token, username, button) {
  console.log(`Attempting to follow user: ${username}`);
  try {
    const response = await ipcRenderer.invoke('follow-user', token, username);
    console.log(`Follow user response for ${username}:`, response);

    if (response.success) {
      console.log(`Successfully followed ${username}`);
      button.innerText = 'Unfollow';
      button.classList.remove('follow');
      button.onclick = () => unfollowUser(token, username, button);

      setTimeout(() => fetchGitHubData(token, tokenData.username), 2000);
    } else {
      console.error(`Failed to follow ${username}`, response);
    }
  } catch (error) {
    console.error('Error following user:', error);
  }
}

// Function to unfollow a user
async function unfollowUser(token, username, button = null) {
  console.log(`Attempting to unfollow user: ${username}`);
  try {
    const response = await ipcRenderer.invoke('unfollow-user', token, username);
    console.log(`Unfollow user response for ${username}:`, response);

    if (response.success) {
      console.log(`Successfully unfollowed ${username}`);

      // If a button was provided, update its text (for manual unfollow actions)
      if (button) {
        button.innerText = 'Follow';
        button.classList.add('follow');
        button.onclick = () => followUser(token, username, button);
      }

      // Optionally refresh data after unfollowing
      await fetchGitHubData(token, tokenData.username);
    } else {
      console.error(`Failed to unfollow ${username}`, response);
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
  }
}

// Function to apply theme and accent color
function applyTheme(theme, accentColor) {
  document.body.className = theme;
  document.documentElement.style.setProperty('--accent-color', accentColor);
}

// Updated fetchUserData function
async function fetchUserData(token) {
  try {
    console.log('Fetching updated user data...');
    const userDetails = await ipcRenderer.invoke('get-user-details', token);
    const followers = await ipcRenderer.invoke('get-followers', token);
    const followingData = await ipcRenderer.invoke('get-following', token);

    console.log('User details fetched:', userDetails);
    console.log('Fetched Followers:', followers);
    console.log('Fetched Following:', followingData);

    // Store the fetched data globally
    allFollowers = followers;
    following = followingData;

    updateTable(allFollowers, following);
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Function to update the table with new data
function updateTable(followers, following) {
  console.log('Updating the table with new data...');
  populateTable(followers, following, tokenData.token);
}
