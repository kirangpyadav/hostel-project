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



const kitchenChiefRoute = require('./Routes/kitchenChiefRoute');
const studentRoutes = require('./Routes/studentRoutes');
const rationRoutes = require('./Routes/rationRoutes'); 
const studentAuthRoutes = require('./Routes/studentAuthRoutes');
const chiefAuthRoutes = require('./Routes/chiefAuthRoutes');
const mealRoutes = require('./Routes/mealRoutes');
const historyRoutes = require('./Routes/historyRoutes');
const leaveRoutes = require('./Routes/leaveRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const studentkitRoutes = require('./Routes/studentkitRoutes');



app.use('/kitchen-chief', kitchenChiefRoute);
app.use('/api/students', studentRoutes);
app.use('/api/rations', rationRoutes);
app.use('/api/student-auth', studentAuthRoutes); 
app.use('/api/chief-auth', chiefAuthRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentkitRoutes);






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
