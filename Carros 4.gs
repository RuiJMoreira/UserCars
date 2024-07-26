var telegram_id = "YourTelegramID";
var debug = false;
var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
var fileName = "caetano_car_data.csv";

function main() {
  var url = "https://api.gsci.pt/ds/search/v2?numberElements=120&page=1&showReservation=1&withUrl=false&sort=updateTime&orderBy=desc";
  var headers = {
    "companyid": "24",
    "Content-Type": "application/json" // Set the Content-Type header
  };
  
  var payload = {
    "filters": {'priceInf': [0], 'priceSup': [15000]},
    "needle": ""
  };
  
  try {
    // Fetch JSON content from the API
    var response = UrlFetchApp.fetch(url, {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload), // Convert payload to JSON string
      "muteHttpExceptions": true
    });
    
    // Log the entire response for debugging
    var responseData = JSON.parse(response.getContentText());
    
    // Check for the expected structure
    if (responseData.data && responseData.data.searchResult) {
      var jsonData = responseData.data.searchResult;
      processCarData(jsonData); // Proceed with processing
    } else {
      Logger.log("Unexpected response structure: " + JSON.stringify(responseData));
    }
  } catch (e) {
    Logger.log("Error fetching data: " + e.toString());
  }
}

// Function to process car data
function processCarData(jsonData) {
  // Initialize array to store car details
  var cars = [];

  // Read existing car URLs and prices from Google Drive
  var sentCarData = readSentCarData();

  // Parse the JSON content to extract car details
  jsonData.forEach(function(carData) {
    var car = {};

    // Extract car details from the response
    car.title = carData.brand + " " + carData.model + " " + carData.version;
    car.url = 'https://caetanoretail.pt/veiculo/'+carData.vin; // Example URL
    car.fuel = carData.fuel;
    car.year = carData.year;
    car.mileage = carData.kilometers + " km";
    car.price = carData.pricePvp;

    // Filter cars by price to be under 15000€
    if (car.price > 1000 && car.price <= 15000) {
      if (!sentCarData[car.url] || sentCarData[car.url] != car.price) {
        cars.push(car);
      }
    }
  });

  // Sort cars by price from lowest to highest
  cars.sort(function(a, b) {
    return a.price - b.price;
  });

  // Prepare car details for the message
  var carsMessage = "";
  var newCarData = {};
  cars.forEach(function(car) {
    var oldPrice = sentCarData[car.url] ? sentCarData[car.url] : null;
    var priceChange = oldPrice === null ? "🆕" : (car.price > oldPrice ? "🔺" : "🔻");
    
    if (priceChange === "🆕") {
      carsMessage += priceChange + " " + car.title + " " + car.fuel + " - " + car.price + "€ - " + car.mileage + " - " + car.year + " - " + car.url + "\n\n";
    } else {
      carsMessage += car.title + " " + car.fuel + " - " + car.price + "€ " + priceChange + " - " + car.mileage + " - " + car.year + " - " + car.url + "\n\n";
    }

    newCarData[car.url] = car.price;
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
