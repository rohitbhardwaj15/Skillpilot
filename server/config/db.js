import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      '⚠️  MONGODB_URI not set — server running WITHOUT a database connection. ' +
      'Set MONGODB_URI in server/.env (see .env.example) to enable persistence.'
    );
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
}
