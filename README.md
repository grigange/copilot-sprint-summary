# Sprint Summary for Copilot

<p align="center">
  <img src="images/logo_ext.png" alt="Sprint Summary for Copilot" width="128" height="128">
</p>

<p align="center">
  <strong>AI-powered sprint summaries from your git history</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=grigange.copilot-sprint-summary">
    <img src="https://img.shields.io/visual-studio-marketplace/v/grigange.copilot-sprint-summary?style=flat-square&label=VS%20Marketplace" alt="VS Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=grigange.copilot-sprint-summary">
    <img src="https://img.shields.io/visual-studio-marketplace/i/grigange.copilot-sprint-summary?style=flat-square" alt="Installs">
  </a>
  <img src="https://img.shields.io/badge/Requires-GitHub%20Copilot-8957e5?style=flat-square&logo=github" alt="Requires GitHub Copilot">
</p>

![Demo](images/showcase.gif)

---

## ⚡ What is this?

**Sprint Summary for Copilot** automatically analyzes your git commits and generates professional sprint summaries using GitHub Copilot's AI. Perfect for:

- 📋 **Sprint retrospectives** — Quickly summarize what your team accomplished
- 📊 **Stakeholder reports** — Generate executive-friendly updates in seconds
- 🗓️ **Standup prep** — Review your recent work at a glance
- 📝 **Documentation** — Keep a record of project progress over time

> ⚠️ **Requires [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)** — This extension uses Copilot's language models to generate summaries.

---

## ✨ Features

### 🚀 One-Click Summary Generation
Click the status bar button or run the command to instantly generate a summary of your recent commits.

### 🎯 Flexible Filtering
- Choose the time range (last 7, 14, 30 days, or custom)
- Filter by author (your commits only or entire team)

### 🤖 AI-Powered Analysis
GitHub Copilot intelligently:
- Groups commits by functional area
- Categorizes changes (Features, Bug Fixes, Improvements, etc.)
- Creates executive-friendly overviews
- Highlights breaking changes

### 📁 Customizable Output
- Configure output folder
- Customize file naming patterns
- Choose your preferred date format
- Open in external apps (Obsidian, Notion, Typora, etc.)

### ⚙️ Team-Friendly Settings
Customize the AI prompt to match your team's workflow, terminology, and reporting requirements.

---

## 📦 Installation

1. **Install GitHub Copilot** (required)
   - [Get GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)

2. **Install Sprint Summary for Copilot**
   - Search for "Sprint Summary for Copilot" in VS Code Extensions
   - Or [install from Marketplace](https://marketplace.visualstudio.com/items?itemName=grigange.copilot-sprint-summary)

---

## 🚀 Quick Start

1. Open a project with git history
2. Click **"Sprint Summary"** in the status bar (bottom right)
3. Enter the number of days to include
4. Select author filter (All Authors or specific person)
5. Wait for AI to generate your summary
6. Done! Your summary is saved as a Markdown file

---

## ⚙️ Configuration

Access settings via **File → Preferences → Settings** and search for "Sprint Summary".

| Setting | Description |
|---------|-------------|
| **Output Folder** | Where to save generated summaries (default: `Documents/Sprint Summaries`) |
| **Date Format** | Format for dates in file names (ISO, European, US, etc.) |
| **File Name Pattern** | Template with placeholders: `{date}`, `{author}`, `{days}` |
| **Custom Open Command** | Open files in external apps (Obsidian, Typora, etc.) |
| **AI Model** | Preferred Copilot model family |
| **System Prompt** | Customize how the AI structures summaries |

### Example: Open in Obsidian

Set **Custom Open Command** to:
```
obsidian://open?vault=MyVault&file=Sprint Summaries/{fileName}
```

---

---

## 📄 Example Output

```markdown
# Sprint Summary - December 2025

## Sprint Overview
This sprint focused on implementing the new authentication system 
and improving dashboard performance. The team completed 23 commits 
across 5 functional areas.

## Changes by Category

### 🔐 Authentication
- Implemented OAuth 2.0 integration with Google
- Added session management and token refresh
- Fixed password reset email formatting

### 📊 Dashboard
- Optimized chart rendering (40% faster load time)
- Added export to PDF functionality
- Fixed timezone display issues

### 🐛 Bug Fixes
- Resolved memory leak in WebSocket handler
- Fixed pagination on mobile devices

## Metrics
- **Total Commits:** 23
- **Date Range:** Dec 1 - Dec 14, 2025
- **Contributors:** 3
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Powered by [GitHub Copilot](https://github.com/features/copilot)

---

<p align="center">
  <strong>Made by <a href="https://github.com/grigange">Angelos Grigoriou</a></strong>
</p>