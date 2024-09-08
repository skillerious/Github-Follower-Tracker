
# 🚀 GitHub Follower Checker

[![Screenshot-2024-09-08-175730.png](https://i.postimg.cc/rmj6S0BD/Screenshot-2024-09-08-175730.png)](https://postimg.cc/qhNZrRMr)

The **GitHub Follower Checker** is a powerful desktop application that allows you to effortlessly track your GitHub followers, detect unfollowers, and visualize your profile's growth trends. Built with Electron, it offers a seamless experience with real-time data updates, insightful visualizations, and customizable settings.

## 🌟 Features

### 👥 **Real-Time Follower Tracking**
- Monitor your GitHub followers in real time with automatic refresh intervals.
- Detect when someone unfollows you and get instant notifications.

### 🚨 **Unfollower Alerts**
- Receive desktop notifications when an unfollower is detected.
- Keep a history of unfollowers for future reference.

### 📊 **Data Visualization**
- Interactive charts and graphs for:
  - **Followers Growth Over Time**: Track the growth of your followers daily.
  - **Monthly Star Growth**: Analyze the monthly growth of stars across your repositories.
  - **Top Repositories by Stars**: Discover your most popular repositories.
  - **Followers vs. Following Comparison**: Visualize your network balance.
- Simple, yet powerful visual insights powered by [Chart.js](https://www.chartjs.org/).

### 🎨 **Dynamic Themes and Customization**
- Switch between **Light** and **Dark** themes for a personalized look.
- Choose an **accent color** that suits your style.

### 🛠 **Advanced Settings and Customization**
- Configure how often the app checks for updates with a customizable refresh interval.
- Enable or disable desktop notifications.
- Opt to launch the app at startup and minimize it to the system tray.

### 🖼 **Beautiful and Responsive UI**
- Intuitive interface with a sleek design, offering easy navigation and interaction.
- Use Font Awesome icons to enhance readability and functionality.

### 📁 **Local Data Management**
- Data stored securely on your device:
  - **`followers.json`**: Tracks the current list of followers.
  - **`unfollowers.json`**: Maintains a list of detected unfollowers.
  - **`followers_growth.json`**: Logs followers growth over time.
  - **`monthly_stars_growth.json`**: Records monthly star growth.

### 📝 **Detailed Logs and Analytics**
- Automatically logs all activities, making it easy to review past actions.
- Provides detailed growth analytics to understand your GitHub presence better.

## 📥 Installation

### Prerequisites

- **Node.js** (v14.x or later) – [Download Here](https://nodejs.org/)
- **npm** – Comes with Node.js

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/skillerious/github-follower-checker.git
   cd github-follower-checker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

## 🖥️ Usage

1. **Launch the App**: Start the application to begin tracking your GitHub followers.
2. **Enter Your Credentials**: You'll be prompted to enter your GitHub **token** and **username** for authentication.
3. **Dashboard Overview**: View a summary of your GitHub profile, including followers, unfollowers, repositories, and more.
4. **Receive Real-Time Updates**: Get notified of any changes in your followers list.
5. **Visualize Data**: Click the **"Visualize Data"** button to open detailed charts and insights about your GitHub activity.
6. **Adjust Settings**: Modify app settings through the settings menu to customize the app to your preferences.

## 🔧 Configuration

- **Refresh Interval**: Set the frequency (in minutes) at which the app checks for follower updates.
- **Notifications**: Toggle desktop notifications for follower changes.
- **Launch on Startup**: Automatically start the app when your computer boots up.
- **Close to Tray**: Keep the app running in the background by closing it to the system tray.
- **Theme and Accent Color**: Personalize your app's look and feel.

## 🚀 Development

### File Structure

- **`main.js`**: Core backend functionality using Electron, including API handling and background processes.
- **`renderer.js`**: Manages the front-end logic and DOM interactions.
- **`index.html`**: Main user interface layout.
- **`visualizations.html`**: Dedicated page for visualizing user data with charts.
- **`settings.html`**: Interface for adjusting user settings.

### Adding New Features

1. **Frontend Changes**: Update `index.html`, `renderer.js`, or `visualizations.html` for new UI elements.
2. **Backend Enhancements**: Modify `main.js` to handle new processes or API calls.
3. **Styling**: Use inline styles or add new stylesheets to improve UI/UX.

## 🤝 Contributions

We welcome all contributions to enhance this project! Follow these steps to contribute:



## 🛡️ License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🙏 Acknowledgements

- [Electron](https://www.electronjs.org/): Framework for building cross-platform desktop apps.
- [GitHub API](https://docs.github.com/en/rest): For fetching GitHub profile, followers, and repository data.
- [Chart.js](https://www.chartjs.org/): For rendering interactive charts.
- [Font Awesome](https://fontawesome.com/): For beautiful icons.

## 📞 Contact

For questions or suggestions, please reach out to [your-email@example.com](mailto:your-email@example.com).

## 💬 Feedback

Id love to hear your feedback! If you encounter any issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/skillerious/github-follower-checker/issues).

![](https://i.postimg.cc/vBbFgLNR/Screenshot-2024-09-08-181817.png)
