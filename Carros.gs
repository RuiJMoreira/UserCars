var telegram_id = "YourTelegramID";
var debug = false;
var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
var fileName = "toyota_car_data.csv";

// Main function
function main() {
  // URL of the webpage containing the JavaScript variable
  var url = "https://usados.toyota.pt/viaturas/pesquisa/toyota/";

  // Fetch HTML content of the webpage
  var response = UrlFetchApp.fetch(url);
  var htmlContent = response.getContentText();

  // Extract JSON data from JavaScript variable
  var jsonDataStr = extractJsonFromJs(htmlContent);
  if (jsonDataStr) {
    var jsonData = JSON.parse(jsonDataStr);
    jsonData.sort(function(a, b) {
      return a.recommendedPrice - b.recommendedPrice;
    });

    // Read existing car URLs and prices from Google Drive
    var sentCarData = readSentCarData();
    var cars = "";
    var newEntries = [];

    for (var i = 0; i < jsonData.length; i++) {
      var car = jsonData[i];
      if (car.recommendedPrice < 15000) {
        var carUrl = "https://usados.toyota.pt" + car.detailUrl;
        var currentPrice = car.recommendedPrice;
        var oldPrice = sentCarData[carUrl] ? sentCarData[carUrl].currentPrice : null;
        
        if (oldPrice === null) {
          // New entry
          cars += "🆕 " + car.title + " " + car.fuelType + " " + car.district + " - " + currentPrice + "€ - " + car.kms + "kms - " + carUrl + "\n\n";
          newEntries.push(carUrl + ";" + currentPrice);
        } else if (currentPrice !== oldPrice) {
          // Price fluctuation
          var priceChange = currentPrice > oldPrice ? "🔺" : "🔻";
          
          cars += car.title + " " + car.fuelType + " " + car.district + " - " + currentPrice + "€ " + priceChange + " - " + car.kms + "kms - " + carUrl + "\n\n";
          newEntries.push(carUrl + ";" + currentPrice);
        }
      }
    }

    if (cars) {
      if (cars.length > 4096) {
        var parts = cars.match(/(.|[\r\n]){1,4096}/g);
        for (var j = 0; j < parts.length; j++) {
          sendTelegramMessage(parts[j]);
        }
      } else {
        sendTelegramMessage(cars);
      }

      // Append new entries to the CSV file
      appendNewEntriesToFile(newEntries);
    } else {
      Logger.log("No cars found with the specified criteria.");
    }
  } else {
    Logger.log("No JSON data found in JavaScript variable.");
  }
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

// Function to extract JSON data from JavaScript variable
function extractJsonFromJs(htmlContent) {
  var pattern = /var\s+allCars\s*=\s*(\[[^\]]*\]);/;
  var match = htmlContent.match(pattern);
  if (match) {
    var jsonData = match[1];
    return jsonData;
  } else {
    return null;
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
          carData[url] = {
            currentPrice: price
          };
        }
      });
    }
  } catch (e) {
    Logger.log("Error reading file: " + e.toString());
  }
  return carData;
}

// Append new URLs and prices to the Google Drive CSV file
function appendNewEntriesToFile(newEntries) {
  var file;
  var newContent = "";
  try {
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      file = files.next();
    } else {
      file = DriveApp.createFile(fileName, "", MimeType.PLAIN_TEXT);
    }

    // Read existing content
    var existingContent = file.getBlob().getDataAsString();
    var existingData = existingContent.split("\n").filter(Boolean);

    // Append new entries
    newEntries.forEach(function(entry) {
      existingData.push(entry);
    });

    // Write updated content back to file
    newContent = existingData.join("\n");
    file.setContent(newContent);
  } catch (e) {
    Logger.log("Error writing to file: " + e.toString());
  }
}
