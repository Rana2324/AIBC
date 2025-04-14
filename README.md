# AIBC Temperature Sensor Monitoring System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-14.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

A robust temperature sensor monitoring system with real-time alerts, data visualization, and comprehensive logging capabilities. This system collects data from temperature sensors, stores it in MongoDB, and provides a modern web interface for monitoring and analysis.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Logging System](#-logging-system)
- [License](#-license)

## ✨ Features

- **Real-time Monitoring**: Live temperature data collection and display
- **Alert System**: Automated notifications when temperatures exceed thresholds
- **Interactive Dashboard**: Modern UI with responsive design
- **Data Visualization**: Historical data trends and analysis
- **Comprehensive Logging**: Detailed system activity tracking
- **WebSocket Integration**: Real-time updates without page refresh
- **Modular Architecture**: Clean separation of concerns for maintainability

## 🏗️ Architecture

The application follows the MVC (Model-View-Controller) architecture:

- **Models**: MongoDB schemas for data structure
- **Views**: EJS templates for rendering the UI
- **Controllers**: Request handlers for business logic

The client-side code is organized into modules following ES6 standards:

- **Core Modules**: `sensorApp.js`, `dataService.js`, `apiService.js`, `uiUtils.js`
- **Compatibility Layer**: `compat.js` for inline event handlers

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/Rana2324/AIBC.git
cd AIBC

# Install dependencies
npm install
```

## ⚙️ Configuration

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/temperatureSensors

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=./logs
```

## 📖 Usage

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Clean log files
npm run clean-logs
```

After starting the server, access the application at: http://localhost:3000

## 📁 Project Structure

```
AIBC/
├── config/             # Configuration files
├── controllers/        # Request handlers
│   ├── sensorController.js
│   └── viewController.js
├── middleware/         # Express middleware
├── models/             # Mongoose models
│   ├── alert.js
│   └── temperatureSensor.js
├── public/             # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   │   ├── apiService.js
│   │   ├── compat.js
│   │   ├── dataService.js
│   │   ├── index.js
│   │   ├── sensorApp.js
│   │   └── uiUtils.js
│   └── img/            # Images
├── routes/             # API and view routes
├── services/           # Business logic services
├── utils/              # Utility functions
├── views/              # EJS templates
├── app.js              # Express application setup
├── server.js           # Entry point
└── package.json        # Dependencies and scripts
```

## 📚 API Documentation

### Sensor Endpoints

| Method | Endpoint           | Description                  | Request Body                   | Response                      |
|--------|-------------------|------------------------------|--------------------------------|-------------------------------|
| GET    | `/api/sensors`     | List all sensors             | -                              | Array of sensor objects       |
| GET    | `/api/sensors/:id` | Get sensor by ID             | -                              | Single sensor object          |
| POST   | `/api/sensors`     | Create new sensor            | `{sensor_id, temperature_data}`| Created sensor object         |
| PUT    | `/api/sensors/:id` | Update sensor                | `{temperature_data, status}`   | Updated sensor object         |
| DELETE | `/api/sensors/:id` | Delete sensor                | -                              | Success message               |

### Data Format

Sensor data format:

```json
{
  "sensor_id": "SENSOR_001",
  "date": "2025-04-14",
  "time": "13:30:00",
  "temperature_data": [23.5, 24.1, 23.8],
  "average_temp": 23.8,
  "status": "0 ：正常"
}
```

## 📊 Logging System

The application uses Winston for advanced logging with the following features:

- **Multi-level Logging**: Error, warn, info, debug levels
- **File Rotation**: Daily log rotation to manage file sizes
- **Compression**: Automatic compression of older logs
- **Separate Streams**: Different files for errors and combined logs

Log files are stored in the `logs/` directory:

- `error.log`: Contains only error-level messages
- `combined.log`: Contains all log messages
- `client.log`: Client-side activity logs

## 📄 License

MIT 
