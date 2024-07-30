var telegram_id = "YourTelegramID";
var debug = false;
var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
var fileName = "filintomota_car_data.csv";

// Function with all logic
function main() {
  // URL of the source page
  var sourceUrl = "https://www.filintomota.pt/?s=&search_tab=used";

  // Fetch the source page HTML
  var sourceResponse = UrlFetchApp.fetch(sourceUrl);
  var sourceHtml = sourceResponse.getContentText();

  // Extract the nonce using regex
  var noncePattern = /"ajax_nonce":"([^"]*)"/;
  var nonceMatch = sourceHtml.match(noncePattern);
  var nonce = nonceMatch ? nonceMatch[1] : null;

  if (!nonce) {
    Logger.log("Failed to extract nonce.");
    return;
  }

  // Construct the API URL with the extracted nonce
  var apiUrl = "https://www.filintomota.pt/wp-admin/admin-ajax.php?action=carsearch&form_id=search-results&nonce=" + nonce + "&valueMaker=all&valueModel=all&valueFuel=all&valueSearchType=used&valueColor=all&valueGearbox=all&valueSeats=all&valueCondition=all&valueGroup=all&valueIntend=all&valueBodytype=all&valuePrice=&valueYear=&valueMileage=&valueInStock=false&valueOrderBy=price_asc&wasFullPrice=true&wasFullYear=true&wasFullMileage=true&renderedVehicles=0";

  // Fetch JSON content from the API
  var response = UrlFetchApp.fetch(apiUrl);
  var jsonData = JSON.parse(response.getContentText()).posts;

  // Initialize array to store car details
  var cars = [];

  // Regex patterns to extract car details
  var titlePattern = /<img[^>]*alt="([^"]*)"/;
  var urlPattern = /<a[^>]*href="([^"]*)"/;
  var fuelPattern = /<div class="characteristics-fuel">\s*([^<]*)\s*<\/div>/;
  var yearPattern = /<div class="characteristics-production_year">\s*([^<]*)\s*<\/div>/;
  var mileagePattern = /<div class="characteristics-kms">\s*([^<]*)\s*<\/div>/;
  var pricePattern = /<span class="vehicle-card__value">([^<]*)<\/span>/;

  // Read existing car URLs and prices from Google Drive
  var sentCarData = readSentCarData();
  
  // Parse the HTML content to extract car details
  jsonData.forEach(function(post) {
    var car = {};

    var titleMatch = post.match(titlePattern);
    car.title = titleMatch ? titleMatch[1].trim() : "Unknown";

    var urlMatch = post.match(urlPattern);
    car.url = urlMatch ? urlMatch[1].trim() : "#";

    var fuelMatch = post.match(fuelPattern);
    car.fuel = fuelMatch ? fuelMatch[1].trim() : "Unknown";

    var yearMatch = post.match(yearPattern);
    car.year = yearMatch ? yearMatch[1].trim() : "Unknown";

    var mileageMatch = post.match(mileagePattern);
    car.mileage = mileageMatch ? mileageMatch[1].trim() : "Unknown";

    var priceMatch = post.match(pricePattern);
    if (priceMatch) {
      car.price = priceMatch[1].replace('€', '').replace('.', '').trim();
      car.price = parseFloat(car.price);
    } else {
      car.price = 0;
    }

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
