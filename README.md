# AIBC Temperature Sensor Monitoring System

A robust temperature sensor monitoring system with real-time alerts, data visualization, and logging capabilities.

## Features

- Real-time temperature data monitoring
- Automated alert system for temperature thresholds
- Data visualization dashboard
- Comprehensive logging with automatic file rotation and compression
- WebSocket integration for live updates

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/AIBC.git
cd AIBC

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/temperatureSensors
LOG_LEVEL=info
```

## Usage

```bash
# Start development server
npm run dev

# Start production server
npm run prod

# Clean log files
npm run clean-logs
```

## Logging System

The application uses Winston for logging with the following features:

- Daily log rotation
- Automatic compression of older logs (using winston-daily-rotate-file)
- Multiple log levels (error, warn, info, debug)
- Separate error and combined logs

## API Routes

- GET `/api/sensors` - List all sensors
- GET `/api/sensors/:id` - Get sensor by ID
- POST `/api/sensors` - Create new sensor
- PUT `/api/sensors/:id` - Update sensor
- DELETE `/api/sensors/:id` - Delete sensor

## License

MIT
