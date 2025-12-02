const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv').config();
console.log("🔍 Environment loaded. GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));



app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => {
  res.json({ message: 'Blog Platform API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});