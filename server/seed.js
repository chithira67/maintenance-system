const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Role = require('./models/Role');
const Status = require('./models/Status');
const Category = require('./models/Category');
const Location = require('./models/Location');
const Equipment = require('./models/Equipment');
const MaintenanceMaster = require('./models/MaintenanceMaster');
const MaintenanceTask = require('./models/MaintenanceTask');
const { SEED_PERMISSIONS_BY_ROLE_NAME } = require('./utils/permissions');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const roleDefs = [
    { role_name: 'Admin', description: 'Full system access' },
    { role_name: 'User', description: 'Regular user — assigned tasks and personal dashboard' },
    { role_name: 'Technician', description: 'Maintenance technician' },
    { role_name: 'Supervisor', description: 'Supervises maintenance — assign, verify, analytics' },
  ];
  await Role.deleteMany({});
  const roles = await Role.insertMany(
    roleDefs.map((r) => ({
      ...r,
      permissions: SEED_PERMISSIONS_BY_ROLE_NAME[r.role_name] || [],
    }))
  );
  console.log('Roles seeded');

  const statusData = [
    { status_name: 'Pending', description: 'Task not started', is_final: false },
    { status_name: 'In Progress', description: 'Task is being worked on', is_final: false },
    { status_name: 'Done', description: 'Task completed', is_final: false },
    { status_name: 'Verified', description: 'Task verified by supervisor/admin', is_final: true },
    { status_name: 'Overdue', description: 'Past due date', is_final: false },
    { status_name: 'Cancelled', description: 'Task cancelled', is_final: true },
  ];
  await Status.deleteMany({});
  const statuses = await Status.insertMany(statusData);
  console.log('Statuses seeded');

  const pending = statuses.find((s) => s.status_name === 'Pending');
  const inProgress = statuses.find((s) => s.status_name === 'In Progress');
  const done = statuses.find((s) => s.status_name === 'Done');
  const overdueSt = statuses.find((s) => s.status_name === 'Overdue');

  const categoryData = [
    { category_name: 'Electrical', code: 'ELEC' },
    { category_name: 'Mechanical', code: 'MECH' },
    { category_name: 'Plumbing', code: 'PLMB' },
    { category_name: 'HVAC', code: 'HVAC' },
    { category_name: 'Civil', code: 'CIVL' },
    { category_name: 'Medical Gas', code: 'MGAS' },
    { category_name: 'Fire Protection', code: 'FIRE' },
    { category_name: 'Laundry', code: 'LAUN' },
    { category_name: 'Kitchen', code: 'KITC' },
  ];
  await Category.deleteMany({});
  const categories = await Category.insertMany(categoryData);
  console.log('Categories seeded');

  const elec = categories.find((c) => c.code === 'ELEC');
  const hvac = categories.find((c) => c.code === 'HVAC');
  const plmb = categories.find((c) => c.code === 'PLMB');
  const mech = categories.find((c) => c.code === 'MECH');
  const fire = categories.find((c) => c.code === 'FIRE');

  const locationData = [
    { location_name: 'Generator Room' },
    { location_name: 'Main Lobby' },
    { location_name: '5th Floor — East Wing' },
    { location_name: 'Rooftop — Cooling Tower' },
    { location_name: 'Basement — Electrical' },
    { location_name: 'Server Room' },
  ];
  await Location.deleteMany({});
  const locations = await Location.insertMany(locationData);
  console.log('Locations seeded');

  const locGen = locations.find((l) => l.location_name === 'Generator Room');
  const locLobby = locations.find((l) => l.location_name === 'Main Lobby');
  const locRoof = locations.find((l) => l.location_name === 'Rooftop — Cooling Tower');

  await Equipment.deleteMany({});
  const equipment = await Equipment.insertMany([
    { equipment_name: '1250 KVA Generator Set No. 1', serial_number: 'GEN-001', category_id: elec._id, location_id: locGen._id },
    { equipment_name: 'HVAC System — Main AHU', serial_number: 'HVAC-01', category_id: hvac._id, location_id: locLobby._id },
    { equipment_name: 'Cooling Tower', serial_number: 'CT-01', category_id: mech._id, location_id: locRoof._id },
    { equipment_name: 'Boiler Plant', serial_number: 'BLR-01', category_id: plmb._id, location_id: locations[4]._id },
    { equipment_name: 'Fire Alarm Control Panel', serial_number: 'FA-01', category_id: fire._id, location_id: locLobby._id },
  ]);
  console.log('Equipment seeded');

  await MaintenanceMaster.deleteMany({});
  const masters = await MaintenanceMaster.insertMany([
    {
      category_id: elec._id,
      reference_no: 'PM-E001',
      description: 'Generator — engine oil level check & visual inspection',
      estimated_duration_hours: 0.5,
      frequencies: ['Daily'],
      locations: [locGen._id],
    },
    {
      category_id: hvac._id,
      reference_no: 'PM-H001',
      description: 'HVAC — filter inspection and belt check',
      estimated_duration_hours: 1,
      frequencies: ['Weekly'],
      locations: [locLobby._id],
    },
    {
      category_id: mech._id,
      reference_no: 'PM-M001',
      description: 'Cooling tower — water treatment and fan inspection',
      estimated_duration_hours: 2,
      frequencies: ['Monthly'],
      locations: [locRoof._id],
    },
    {
      category_id: plmb._id,
      reference_no: 'PM-P001',
      description: 'Boiler — full service and safety valve check',
      estimated_duration_hours: 4,
      frequencies: ['Quarterly'],
      locations: [locations[4]._id],
    },
    {
      category_id: fire._id,
      reference_no: 'PM-F001',
      description: 'Fire suppression system — annual test and certification',
      estimated_duration_hours: 3,
      frequencies: ['Annual'],
      locations: [locLobby._id],
    },
  ]);
  console.log('Maintenance masters seeded');

  const adminRole = roles.find((r) => r.role_name === 'Admin');
  const userRole = roles.find((r) => r.role_name === 'User');
  const techRole = roles.find((r) => r.role_name === 'Technician');
  const supRole = roles.find((r) => r.role_name === 'Supervisor');

  await User.deleteMany({});
  const adminUser = await User.create({
    username: 'admin',
    name: 'System Administrator',
    email: 'admin@maintenance.com',
    password_hash: 'Admin@1234',
    phone: '+94 77 000 0001',
    is_active: true,
    roles: [adminRole._id],
  });
  const techUser = await User.create({
    username: 'john',
    name: 'John Technician',
    email: 'john@maintenance.com',
    password_hash: 'User@1234',
    phone: '+94 77 000 0002',
    is_active: true,
    roles: [techRole._id],
  });
  const supervisorUser = await User.create({
    username: 'sarah',
    name: 'Sarah Supervisor',
    email: 'sarah@maintenance.com',
    password_hash: 'User@1234',
    phone: '+94 77 000 0003',
    is_active: true,
    roles: [supRole._id],
  });
  await User.create({
    username: 'basic',
    name: 'Basic User',
    email: 'user@maintenance.com',
    password_hash: 'User@1234',
    phone: '+94 77 000 0004',
    is_active: true,
    roles: [userRole._id],
  });
  console.log('Users seeded');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const overdueDate = new Date(today);
  overdueDate.setDate(overdueDate.getDate() - 5);

  await MaintenanceTask.deleteMany({});
  await MaintenanceTask.insertMany([
    {
      task_code: 'M001',
      maintenance_id: masters[0]._id,
      equipment_id: equipment[0]._id,
      frequency: 'Daily',
      start_date: yesterday,
      last_done: yesterday,
      next_due: today,
      assigned_to: techUser._id,
      status_id: pending._id,
      priority: 'High',
    },
    {
      task_code: 'M002',
      maintenance_id: masters[1]._id,
      equipment_id: equipment[1]._id,
      frequency: 'Weekly',
      start_date: today,
      next_due: nextWeek,
      assigned_to: techUser._id,
      status_id: inProgress._id,
      priority: 'Medium',
    },
    {
      task_code: 'M003',
      maintenance_id: masters[2]._id,
      equipment_id: equipment[2]._id,
      frequency: 'Monthly',
      start_date: today,
      next_due: overdueDate,
      assigned_to: techUser._id,
      status_id: overdueSt._id,
      priority: 'Critical',
    },
    {
      task_code: 'M004',
      maintenance_id: masters[3]._id,
      equipment_id: equipment[3]._id,
      frequency: 'Quarterly',
      start_date: today,
      next_due: nextWeek,
      assigned_to: supervisorUser._id,
      status_id: done._id,
      priority: 'Medium',
      completed_date: yesterday,
    },
  ]);
  console.log('Maintenance tasks seeded');

  console.log('\n✅ Seed complete!');
  console.log('   Admin       → admin@maintenance.com     / Admin@1234');
  console.log('   Supervisor  → sarah@maintenance.com     / User@1234');
  console.log('   Technician  → john@maintenance.com      / User@1234');
  console.log('   Basic User  → user@maintenance.com      / User@1234');
  mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
