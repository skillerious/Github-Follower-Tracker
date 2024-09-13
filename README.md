
# 🚀 GitHub Follower Checker

[![Screenshot-2024-09-10-230059.png](https://i.postimg.cc/RVfJx4PC/Screenshot-2024-09-10-230059.png)](https://postimg.cc/1fm3phhb)

The **GitHub Follower Checker** is a robust desktop application designed to help you monitor your GitHub followers, detect unfollowers, and visualize trends in your profile's growth. Built using Electron, the app offers a smooth, responsive interface with real-time updates, customizable settings, and powerful visual insights.

## 🌟 Features

### 👥 **Real-Time Follower Tracking**
- Automatically tracks your GitHub followers in real time.
- Detect when someone unfollows you and receive instant notifications.

### 🚨 **Unfollower Alerts**
- Get desktop notifications whenever someone unfollows you.
- Keep a history of all unfollowers for easy reference.

### 🔄 **Automatic Unfollowing**
- If someone unfollows you, the app will check if you're following them.

### 📊 **Data Visualization**
- Comprehensive charts and graphs powered by [Chart.js](https://www.chartjs.org/) for:
  - **Followers Growth Over Time**: Track your daily follower growth.
  - **Monthly Star Growth**: Visualize the monthly growth in stars across your repositories.
  - **Top Repositories by Stars**: Discover your most popular repositories by stars.
  - **Followers vs. Following Comparison**: Analyze the balance between your followers and following lists.
- Detailed, interactive visual insights for better understanding.

### 🎨 **Dynamic Themes and Customization**
- Toggle between **Light** and **Dark** themes to suit your preferences.
- Customize your app’s accent color for a personalized look.

### 🛠 **Advanced Settings and Customization**
- Set the app's refresh interval to determine how frequently it checks for updates.
- Enable or disable desktop notifications for follower changes.
- Optionally launch the app at startup and minimize it to the system tray.

### 🖼 **Beautiful and Responsive UI**
- Clean, intuitive interface for smooth navigation and interaction.
- Utilize Font Awesome icons for enhanced readability and function.

### 📁 **Local Data Management**
- Your data is stored locally and securely:
  - **\`followers.json\`**: Stores the current list of followers.
  - **\`unfollowers.json\`**: Logs users who have unfollowed you.
  - **\`followers_growth.json\`**: Records daily growth of your followers.
  - **\`monthly_stars_growth.json\`**: Tracks monthly star growth across your repositories.

### 📝 **Detailed Logs and Analytics**
- Automatically keeps logs of all activities, making it easy to review past actions.
- Provides detailed analytics on your followers and repository activity.

## 📥 Installation

### Prerequisites

- **Node.js** (v14.x or later) – [Download Here](https://nodejs.org/)
- **npm** – Comes bundled with Node.js

### Installation Steps

1. **Clone the Repository**
   \`\`\`bash
   git clone https://github.com/skillerious/github-follower-checker.git
   cd github-follower-checker
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the Application**
   \`\`\`bash
   npm start
   \`\`\`

4. **Input Credentials**

[![Screenshot-2024-09-09-225933.png](https://i.postimg.cc/SR0LW2Bz/Screenshot-2024-09-09-225933.png)](https://postimg.cc/bDT2PJNz)

## 🖥️ Usage

1. **Launch the App**: Start the app by running the appropriate command or clicking the app icon.
2. **Enter Your Credentials**: You'll be prompted to enter your GitHub **token** and **username** for authentication.
3. **Dashboard Overview**: View a summary of your GitHub profile, including followers, unfollowers, and repository details.
4. **Receive Real-Time Updates**: Notifications and updates are pushed to you instantly as changes occur in your follower list.
5. **Visualize Data**: Click the **"Visualize Data"** button to explore detailed charts and insights about your GitHub activity.
6. **Adjust Settings**: Use the settings menu to adjust the refresh interval, enable or disable notifications, and personalize the app with themes and colors.

## 🔧 Configuration

- **Refresh Interval**: Set how frequently the app checks for updates (in minutes).
- **Notifications**: Enable or disable desktop notifications when follower changes are detected.
- **Launch on Startup**: Configure the app to start automatically when your computer boots.
- **Close to Tray**: Keep the app running in the background by minimizing it to the system tray.
- **Theme and Accent Color**: Customize the app's appearance by switching between Light and Dark themes and selecting an accent color.

## 🚀 Development

### File Structure

- **\`main.js\`**: Core backend functionality, including Electron setup, API handling, and background processes.
- **\`renderer.js\`**: Handles frontend logic and interaction with the DOM.
- **\`index.html\`**: Main user interface structure.
- **\`settings.html\`**: Interface for user settings and preferences.

### Adding New Features

1. **Frontend Changes**: Modify \`index.html\`, \`renderer.js\`, or \`visualizations.html\` to add or enhance UI elements.
2. **Backend Enhancements**: Update \`main.js\` to handle new processes or API interactions.
3. **Styling**: Customize styles with inline CSS or additional stylesheets for improved UI/UX.

## 🤝 Contributions

We welcome all contributions to enhance this project. Feel free to submit a pull request or open an issue with your suggestions.

## 🛡️ License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🙏 Acknowledgements

- [Electron](https://www.electronjs.org/): Framework for building cross-platform desktop apps.
- [GitHub API](https://docs.github.com/en/rest): API for fetching GitHub profile, followers, and repository data.
- [Chart.js](https://www.chartjs.org/): For rendering interactive charts.
- [Font Awesome](https://fontawesome.com/): Icon library used in the application.

## 📞 Contact

For questions or suggestions, please reach out to [skillerious@gmail.com](mailto:skillerious@gmail.com).

## 💬 Feedback

We would love to hear your feedback! If you encounter any issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/skillerious/github-follower-checker/issues).

[![Screenshot-2024-09-10-230121.png](https://i.postimg.cc/FFwk67Vn/Screenshot-2024-09-10-230121.png)](https://postimg.cc/mhNrzZqQ)

[![Screenshot-2024-09-13-233934.png](https://i.postimg.cc/d19sgV8k/Screenshot-2024-09-13-233934.png)](https://postimg.cc/TLpvDGNf)
