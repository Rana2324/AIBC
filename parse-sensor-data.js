/**
 * Script to parse temperature sensor data from terminal output and save to MongoDB
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Function to extract JSON data from a line
function extractJsonFromLine(line) {
  try {
    if (!line.includes('Received data:')) return null;
    
    // Extract the JSON part from the line
    const jsonStartIndex = line.indexOf('{');
    const jsonEndIndex = line.lastIndexOf('}');
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) return null;
    
    const jsonString = line.substring(jsonStartIndex, jsonEndIndex + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error extracting JSON:', error);
    return null;
  }
}

// Function to send data to the API
async function sendDataToMongoDB(data) {
  try {
    const response = await fetch('http://localhost:3000/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    return { success: response.ok, data: responseData };
  } catch (error) {
    console.error('Error sending data to API:', error);
    return { success: false, error: error.message };
  }
}

// Main function to process the data
async function processSensorData() {
  // Sample data from terminal output
  const terminalData = `Received data: {"sensor_id":"sensor_2","date":"2025-04-04","time":"10:53:40:799","temperature_data":[25,25.2,25.4,25.6,25.3,25.4,25.7,25.8,25.3,25.2,25.6,25.6,25.4,25.1,25.2,25.1],"average_temp":25.368750000000002,"status":"0 ：正常"}
Received data: {"sensor_id":"sensor_2","date":"2025-04-04","time":"10:53:32:829","temperature_data":[25,25.1,25.4,25.6,25.2,25.4,25.6,25.8,25.3,25.2,25.6,25.5,25.4,25.1,25.1,25],"average_temp":25.33125,"status":"0 ：正常"}
Received data: {"sensor_id":"sensor_2","date":"2025-04-04","time":"10:53:52:754","temperature_data":[25,25.1,25.3,25.5,25.2,25.3,25.6,25.8,25.2,25.2,25.5,25.4,25.4,25,25.1,25],"average_temp":25.287499999999998,"status":"0 ：正常"}
Received data: {"sensor_id":"sensor_2","date":"2025-04-04","time":"10:53:41:412","temperature_data":[25.1,25.2,25.4,25.6,25.3,25.4,25.7,25.8,25.3,25.2,25.6,25.6,25.5,25.1,25.2,25.1],"average_temp":25.38125,"status":"0 ：正常"}
Received data: {"sensor_id":"sensor_2","date":"2025-04-04","time":"10:53:16:888","temperature_data":[24.9,25,25.3,25.5,25.1,25.3,25.6,25.7,25.1,25.1,25.5,25.4,25.4,25,25,24.9],"average_temp":25.237499999999997,"status":"0 ：正常"}`;

  // Split the data into lines
  const lines = terminalData.split('\n');
  
  // Process each line
  for (const line of lines) {
    const jsonData = extractJsonFromLine(line);
    
    if (jsonData) {
      console.log(`Processing data for sensor ${jsonData.sensor_id} at ${jsonData.time}`);
      
      // Send data to MongoDB
      const result = await sendDataToMongoDB(jsonData);
      
      if (result.success) {
        console.log(`Successfully saved data: ${JSON.stringify(result.data)}`);
      } else {
        console.error(`Failed to save data: ${JSON.stringify(result.error || result.data)}`);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Run the main function
console.log('Starting to process sensor data...');
processSensorData()
  .then(() => console.log('Finished processing sensor data'))
  .catch(error => console.error('Error processing sensor data:', error));
