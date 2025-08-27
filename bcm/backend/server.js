const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Routes

const adminAuthRoutes = require('./Routes/adminAuth');
const chiefAuthRoutes = require('./Routes/chiefauth');
const kitchenChiefRoute = require('./Routes/kitchenChiefRoute');
const studentRoutes = require('./Routes/studentRoutes');
const rationRoutes = require('./Routes/rationRoutes'); 
const studentAuthRoutes = require('./Routes/studentAuthRoutes');


app.use('/api/admin', adminAuthRoutes);
app.use('/api/chief', chiefAuthRoutes);
app.use('/kitchen-chief', kitchenChiefRoute);
app.use('/api/students', studentRoutes);
app.use('/api/rations', rationRoutes);
app.use('/api/student-auth', studentAuthRoutes); 


// ✅ Serve Static Files (for plain frontend)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, '../frontend')));




// ✅ Optional fallback for index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
