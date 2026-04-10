import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Menu,
  MenuItem,
  Button,
  Avatar,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Dashboard as DashboardIcon,
  CheckCircle as TasksIcon,
  People as UsersIcon,
  Security as RolesIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    axios.get('/api/notifications').then(r => setNotifications(r.data)).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await axios.patch('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard' },
    { text: 'Calendar', icon: <CalendarIcon />, to: '/calendar' },
    { text: 'Tasks', icon: <TasksIcon />, to: '/tasks' },
  ];

  if (isAdmin()) {
    menuItems.push(
      { text: 'Users', icon: <UsersIcon />, to: '/users' },
      { text: 'Roles', icon: <RolesIcon />, to: '/roles' }
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Maintenance System
          </Typography>
          <IconButton color="inherit" onClick={handleNotificationClick}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Avatar sx={{ ml: 2 }}>{user?.name?.charAt(0).toUpperCase()}</Avatar>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <BuildIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap>
            Maintenance
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton component={NavLink} to={item.to}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.roles?.join(', ')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ mt: 1 }}
            fullWidth
          >
            Logout
          </Button>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleNotificationClose}
        PaperProps={{
          style: {
            maxHeight: 300,
            width: '20ch',
          },
        }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllRead} sx={{ ml: 'auto' }}>
              Mark all read
            </Button>
          )}
        </MenuItem>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          notifications.map((n) => (
            <MenuItem key={n._id} sx={{ fontWeight: n.is_read ? 'normal' : 'bold' }}>
              <Box>
                <Typography variant="body2">{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(n.created_at).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}
