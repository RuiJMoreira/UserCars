var telegram_id = "YourTelegramID";
var debug = false;
var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
var fileName = "mcoutinho_car_data.csv";

// Function with all logic
function main() {
  // URL of the API
  var url = "https://pa2pe80fli-dsn.algolia.net/1/indexes/mcoutinho_vehicles?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.30.0%3Binstantsearch.js%202.10.4%3BJS%20Helper%202.26.1&x-algolia-application-id=PA2PE80FLI&x-algolia-api-key=23060101f46cff3ede15a2925b6f5c02";

  // Fetch JSON content from the API
  var response = UrlFetchApp.fetch(url);
  var jsonData = JSON.parse(response.getContentText()).hits;

  // Read existing car URLs and prices from Google Drive
  var sentCarData = readSentCarData();
  
  // Initialize message content
  var carsMessage = "";
  var newCarData = {};

  // Process each car in the response
  jsonData.forEach(function(car) {
    if (car.price > 1000) {
      var carUrl = "https://www.mcoutinho.pt" + car.url;
      var oldPrice = sentCarData[carUrl] ? sentCarData[carUrl] : null;
      var priceChangeSymbol = oldPrice === null ? "🆕" : (car.price > oldPrice ? "🔺" : (car.price < oldPrice ? "🔻" : ""));

      if (priceChangeSymbol) {
        carsMessage += `${priceChangeSymbol} ${car.title} ${car.fuel} - ${car.price}€ - ${car.mileage}kms - ${carUrl}\n\n`;
        newCarData[carUrl] = car.price;
      }
    }
  });

  // Send car details via Telegram if any found
  if (carsMessage) {
    var parts = splitMessage(carsMessage, 4096 - date.length - 2); // Adjusting the limit to accommodate the date and newline
    for (var j = 0; j < parts.length; j++) {
      sendTelegramMessage(parts[j]);
    }

    // Update the CSV file with new URLs and prices
    appendCarDataToFile(newCarData);
  } else {
    Logger.log("No cars found with the specified criteria.");
  }
}

// Split the message into parts within the character limit
function splitMessage(message, limit) {
  var parts = [];
  while (message.length > limit) {
    var part = message.substring(0, limit);
    var lastNewlineIndex = part.lastIndexOf('\n');
    if (lastNewlineIndex > -1) {
      part = message.substring(0, lastNewlineIndex + 1);
    }
    parts.push(part);
    message = message.substring(part.length);
  }
  parts.push(message);
  return parts;
}

// Send message via Telegram function
function sendTelegramMessage(message) {
  var params = {
    "method": "post",
    "payload": {
      "chat_id": telegram_id,
      "text": date + "\n\n" + message
    }
  };
  var response = UrlFetchApp.fetch("https://api.telegram.org/YourBotToken/sendMessage", params);
  if (response.getResponseCode() == 200) {
    Logger.log("Message sent successfully");
  } else {
    if (debug) {
      Logger.log(response.getContentText());
    } else {
      Logger.log("Failed to send message");
    }
  }
}

// Read URLs and prices from the Google Drive CSV file
function readSentCarData() {
  var file;
  var carData = {};
  try {
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      file = files.next();
      var content = file.getBlob().getDataAsString();
      var lines = content.split("\n").filter(Boolean);
      lines.forEach(function(line) {
        var parts = line.split(";");
        if (parts.length == 2) {
          var url = parts[0].trim();
          var price = parseFloat(parts[1].trim());
          carData[url] = price;
        }
      });
    }
  } catch (e) {
    Logger.log("Error reading file: " + e.toString());
  }
  return carData;
}

// Append new URLs and prices to the Google Drive CSV file
function appendCarDataToFile(newCarData) {
  var file;
  var newContent = "";
  try {
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      file = files.next();
    } else {
      file = DriveApp.createFile(fileName, "", MimeType.PLAIN_TEXT);
    }

    // Read the existing content
    var existingContent = file.getBlob().getDataAsString();
    var existingData = existingContent.split("\n").filter(Boolean);
    var existingCarData = {};

    // Populate existing car data
    existingData.forEach(function(line) {
      var parts = line.split(";");
      if (parts.length == 2) {
        var url = parts[0].trim();
        var price = parseFloat(parts[1].trim());
        existingCarData[url] = price;
      }
    });

    // Merge existing data with new data
    for (var url in newCarData) {
      existingCarData[url] = newCarData[url];
    }

    // Create new content with merged data
    for (var url in existingCarData) {
      newContent += url + ";" + existingCarData[url] + "\n";
    }

    // Update file content
    file.setContent(newContent);
  } catch (e) {
    Logger.log("Error writing to file: " + e.toString());
  }
}
