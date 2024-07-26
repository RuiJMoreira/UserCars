# Car Data Scraper

This repository contains scripts for scraping used car data from various websites and sending updates via Telegram. The scripts are designed to track car prices, notify users about price changes or new listings, and store car data in Google Drive.

## Table of Contents

- [Overview](#overview)
- [Files](#files)
- [Setup](#setup)
- [Usage](#usage)
- [License](#license)

## Overview

This repository includes multiple scripts that interact with different car data APIs and websites. Each script performs the following tasks:
1. Fetches car data from a specific source.
2. Processes the data to extract relevant information.
3. Compares it against previously saved data.
4. Sends updates via Telegram if there are any changes.
5. Updates the saved data in Google Drive.

## Files

### `Carros 4`

- **Description:** Fetches car data from the Caetano Retail API, processes the data, and sends updates via Telegram.
- **Key Features:**
  - Fetches data from a JSON API.
  - Processes and filters car listings based on price.
  - Sends notifications via Telegram.
  - Updates a CSV file on Google Drive with the latest data.
  
### `Carros 3`

- **Description:** Fetches car data from the Filinto Mota website using HTML parsing, processes the data, and sends updates via Telegram.
- **Key Features:**
  - Scrapes HTML content for car data.
  - Uses regex patterns to extract car details.
  - Sends notifications via Telegram.
  - Updates a CSV file on Google Drive with the latest data.

### `Carros 2`

- **Description:** Fetches car data from the M Coutinho website, processes the data, and sends updates via Telegram.
- **Key Features:**
  - Fetches data from an Algolia search API.
  - Processes car listings based on price.
  - Sends notifications via Telegram.
  - Updates a CSV file on Google Drive with the latest data.

### `Carros`

- **Description:** Fetches car data from the Toyota website, processes the data, and sends updates via Telegram.
- **Key Features:**
  - Extracts JSON data embedded in a webpage.
  - Processes and filters car listings based on price.
  - Sends notifications via Telegram.
  - Updates a CSV file on Google Drive with the latest data.

## Setup

### Prerequisites

- **Google Apps Script:** Used for the scripts; ensure you have access to Google Apps Script to run these.
- **Telegram Bot:** Create a bot on Telegram to send messages. Replace the bot token and chat ID in the scripts with your own.
- **Google Drive:** Ensure you have access to Google Drive where the CSV files will be saved and updated.

### Configuration

1. **Create and Configure the Telegram Bot:**
   - Create a new bot on Telegram using BotFather.

2. **Google Drive Setup:**
   - The scripts will automatically create and update CSV files in Google Drive.

3. **Script Configuration:**
   - Copy the bot token and set it in the `sendTelegramMessage` function in each script.
   - Get your chat ID and set it in the `telegram_id` variable.

## Usage

1. **Deploy the Scripts:**
   - Open Google Apps Script and create a new project.
   - Copy and paste the content of each script file into separate script files within the project.
   - Save and authorize the scripts.

2. **Run the Scripts:**
   - Execute the `main` function in each script to start fetching and processing data.
   - You can automate the scripts using the Google Apps Script triggers.

3. **Check Updates:**
   - After running the scripts, check your Telegram for notifications.
   - Review and verify the data updates in the Google Drive CSV files.

## License

This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

Feel free to modify based on any specific requirements or instructions for your environment.
