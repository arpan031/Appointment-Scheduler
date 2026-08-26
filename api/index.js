import express from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

const app = express();

app.use(express.json());

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not configured');
  }

  cachedConnection = await mongoose.connect(uri);
  return cachedConnection;
}

function sendError(res, error) {
  console.error(error);

  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.fromEntries(
        Object.entries(error.errors).map(([key, value]) => [
          key,
          value.message
        ])
      )
    });
  }

  if (error?.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid appointment ID'
    });
  }

  return res.status(500).json({
    message: error?.message || 'Internal server error'
  });
}


app.get('/api', (_req, res) => {
  res.json({
    message: 'Appointment Scheduler API is running'
  });
});

// GET all
app.get('/api/appointments', async (_req, res) => {
  try {
    await connectDB();

    const appointments = await Appointment
      .find()
      .sort({
        date: 1,
        time: 1,
        createdAt: -1
      });

    res.json(appointments);
  } catch (error) {
    sendError(res, error);
  }
});

// GET one
app.get('/api/appointments/:id', async (req, res) => {
  try {
    await connectDB();

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    res.json(appointment);
  } catch (error) {
    sendError(res, error);
  }
});

// CREATE
app.post('/api/appointments', async (req, res) => {
  try {
    await connectDB();

    const appointment = await Appointment.create(req.body);

    res.status(201).json(appointment);
  } catch (error) {
    sendError(res, error);
  }
});

// UPDATE
app.put('/api/appointments/:id', async (req, res) => {
  try {
    await connectDB();

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    res.json(appointment);
  } catch (error) {
    sendError(res, error);
  }
});

// DELETE
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await connectDB();

    const appointment = await Appointment.findByIdAndDelete(
      req.params.id
    );

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    res.json({
      message: 'Appointment deleted successfully',
      appointment
    });
  } catch (error) {
    sendError(res, error);
  }
});

export default app;
