/**
 * Script to parse terminal output and send temperature sensor data to MongoDB
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();



// Parse the data from the terminal output
const parseTerminalData = (data) => {
  const lines = data.split('\n');
  const jsonDataArray = [];

  lines.forEach(line => {
    if (line.startsWith('Received data:')) {
      try {
        // Extract the JSON part from the line
        const jsonString = line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1);
        const jsonData = JSON.parse(jsonString);
        jsonDataArray.push(jsonData);
      } catch (error) {
        console.error('Error parsing JSON data:', error);
      }
    }
  });

  return jsonDataArray;
};

// Function to send data to the server
const sendDataToServer = async (data) => {
  try {
    const response = await fetch('http://localhost:3000/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log(`Data sent successfully for sensor ${data.sensor_id} at ${data.time}: ${result.message}`);
    return result;
  } catch (error) {
    console.error('Error sending data to server:', error);
    return null;
  }
};

// Main function to process and send all data
const processAndSendData = async () => {
  console.log('Starting to process and send temperature sensor data...');
  
  // Parse the terminal data
  const sensorDataArray = parseTerminalData(terminalData);
  console.log(`Found ${sensorDataArray.length} sensor data entries to process`);
  
  // Send each data entry to the server with a small delay to avoid overwhelming the server
  for (let i = 0; i < sensorDataArray.length; i++) {
    const data = sensorDataArray[i];
    console.log(`Processing data ${i+1}/${sensorDataArray.length}: Sensor ${data.sensor_id}, Time: ${data.time}`);
    
    await sendDataToServer(data);
    
    // Add a small delay between requests
    if (i < sensorDataArray.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('All sensor data has been processed and sent to the server');
};

// Execute the main function
processAndSendData().catch(error => {
  console.error('Error in main process:', error);
});
