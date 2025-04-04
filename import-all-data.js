/**
 * Script to import all temperature sensor data from the provided terminal output
 * and save it to MongoDB
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// The raw terminal data as a string with all the sensor readings

/**
 * Function to extract JSON data from a line of terminal output
 * @param {string} line - A line from the terminal output
 * @returns {object|null} - Parsed JSON object or null if invalid
 */
function extractJsonFromLine(line) {
  try {
    // Check if line contains sensor data
    if (!line.includes('Received data:')) {
      return null;
    }

    // Find the JSON part of the line
    const jsonStartIndex = line.indexOf('{');
    const jsonEndIndex = line.lastIndexOf('}');
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
      console.error('Invalid JSON format in line:', line);
      return null;
    }

    // Extract and parse the JSON
    const jsonString = line.substring(jsonStartIndex, jsonEndIndex + 1);
    const parsedData = JSON.parse(jsonString);
    
    // Validate required fields
    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    for (const field of requiredFields) {
      if (!parsedData[field]) {
        console.error(`Missing required field: ${field} in data:`, parsedData);
        return null;
      }
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing JSON from line:', error);
    return null;
  }
}

/**
 * Function to send data to the MongoDB server via API
 * @param {object} data - The sensor data to send
 * @returns {Promise<object>} - Response from the server
 */
async function sendDataToServer(data) {
  try {
    console.log(`Sending data for sensor ${data.sensor_id} at time ${data.time}...`);
    
    const response = await fetch('http://localhost:3000/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}: ${JSON.stringify(responseData)}`);
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error sending data to server:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Function to save successful and failed imports to files for reference
 * @param {Array} successful - Array of successfully imported data
 * @param {Array} failed - Array of failed imports
 */
async function saveImportResults(successful, failed) {
  try {
    // Create a timestamp for the filenames
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Save successful imports
    if (successful.length > 0) {
      await fs.writeFile(
        `./successful-imports-${timestamp}.json`,
        JSON.stringify(successful, null, 2)
      );
      console.log(`Saved ${successful.length} successful imports to successful-imports-${timestamp}.json`);
    }
    
    // Save failed imports
    if (failed.length > 0) {
      await fs.writeFile(
        `./failed-imports-${timestamp}.json`,
        JSON.stringify(failed, null, 2)
      );
      console.log(`Saved ${failed.length} failed imports to failed-imports-${timestamp}.json`);
    }
  } catch (error) {
    console.error('Error saving import results:', error);
  }
}

/**
 * Main function to process all the sensor data
 */
async function processAllSensorData() {
  console.log('Starting to process temperature sensor data...');
  
  // Split the terminal data into lines
  const lines = terminalData.split('\n');
  console.log(`Found ${lines.length} lines of data to process`);
  
  const successfulImports = [];
  const failedImports = [];
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sensorData = extractJsonFromLine(line);
    
    if (!sensorData) {
      console.log(`Line ${i + 1}: Could not extract valid sensor data`);
      failedImports.push({ line, error: 'Invalid or incomplete data' });
      continue;
    }
    
    // Send data to server
    const result = await sendDataToServer(sensorData);
    
    if (result.success) {
      console.log(`Line ${i + 1}: Successfully imported data for sensor ${sensorData.sensor_id} at ${sensorData.time}`);
      successfulImports.push({
        index: i,
        sensor_id: sensorData.sensor_id,
        time: sensorData.time,
        status: sensorData.status
      });
    } else {
      console.error(`Line ${i + 1}: Failed to import data:`, result.error);
      failedImports.push({
        index: i,
        data: sensorData,
        error: result.error
      });
    }
    
    // Add a small delay between requests to avoid overwhelming the server
    if (i < lines.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Print summary
  console.log('\nImport Summary:');
  console.log(`Total lines processed: ${lines.length}`);
  console.log(`Successfully imported: ${successfulImports.length}`);
  console.log(`Failed imports: ${failedImports.length}`);
  
  // Save results to files
  await saveImportResults(successfulImports, failedImports);
  
  console.log('\nImport process completed!');
}

// Run the main function
processAllSensorData().catch(error => {
  console.error('Unhandled error in main process:', error);
});
