const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Role = require('./models/Role');
const Status = require('./models/Status');
const Category = require('./models/Category');
const Location = require('./models/Location');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Roles
  const roleData = [
    { role_name: 'Admin', description: 'Full system access' },
    { role_name: 'User', description: 'Regular user - view and update own tasks' },
    { role_name: 'Technician', description: 'Maintenance technician' },
    { role_name: 'Supervisor', description: 'Supervises maintenance tasks' },
  ];
  await Role.deleteMany({});
  const roles = await Role.insertMany(roleData);
  console.log('Roles seeded');

  // Statuses
  const statusData = [
    { status_name: 'Pending',     description: 'Task not started',       is_final: false },
    { status_name: 'In Progress', description: 'Task is being worked on', is_final: false },
    { status_name: 'Done',        description: 'Task completed',          is_final: false },
    { status_name: 'Verified',    description: 'Task verified by admin',  is_final: true  },
    { status_name: 'Overdue',     description: 'Past due date',           is_final: false },
    { status_name: 'Cancelled',   description: 'Task cancelled',          is_final: true  },
  ];
  await Status.deleteMany({});
  await Status.insertMany(statusData);
  console.log('Statuses seeded');

  // Categories
  const categoryData = [
    { category_name: 'Electrical',  code: 'ELEC' },
    { category_name: 'Mechanical',  code: 'MECH' },
    { category_name: 'Plumbing',    code: 'PLMB' },
    { category_name: 'HVAC',        code: 'HVAC' },
    { category_name: 'Civil',       code: 'CIVL' },
  ];
  await Category.deleteMany({});
  await Category.insertMany(categoryData);
  console.log('Categories seeded');

  // Locations
  const locationData = [
    { location_name: 'Building A - Floor 1' },
    { location_name: 'Building A - Floor 2' },
    { location_name: 'Building B - Basement' },
    { location_name: 'Rooftop' },
    { location_name: 'Server Room' },
  ];
  await Location.deleteMany({});
  await Location.insertMany(locationData);
  console.log('Locations seeded');

  // Admin user
  const adminRole = roles.find(r => r.role_name === 'Admin');
  const userRole  = roles.find(r => r.role_name === 'User');

  await User.deleteMany({});
  await User.create({
    username:      'admin',
    name:          'System Administrator',
    email:         'admin@maintenance.com',
    password_hash: 'Admin@1234',
    phone:         '+94 77 000 0001',
    is_active:     true,
    roles:         [adminRole._id],
  });
  await User.create({
    username:      'john',
    name:          'John Technician',
    email:         'john@maintenance.com',
    password_hash: 'User@1234',
    phone:         '+94 77 000 0002',
    is_active:     true,
    roles:         [userRole._id],
  });
  console.log('Users seeded');
  console.log('\n✅ Seed complete!');
  console.log('   Admin  → admin@maintenance.com  / Admin@1234');
  console.log('   User   → john@maintenance.com   / User@1234');
  mongoose.disconnect();
}

seed().catch(err => { console.error(err); mongoose.disconnect(); });
