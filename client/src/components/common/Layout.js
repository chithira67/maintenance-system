import React, { useState, useEffect } from 'react';
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
  Storage as MasterDataIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

export default function Layout() {
  const { user, logout, can, canAny } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    axios.get('/api/notifications').then((r) => setNotifications(r.data)).catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await axios.patch('/api/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
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

  const menuItems = [{ text: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard', show: true }];

  if (can('masters:manage')) {
    menuItems.push({ text: 'Master data', icon: <MasterDataIcon />, to: '/master-data', show: true });
  }

  menuItems.push(
    { text: 'Calendar', icon: <CalendarIcon />, to: '/calendar', show: true },
    { text: 'Tasks', icon: <TasksIcon />, to: '/tasks', show: true }
  );

  if (can('users:manage')) {
    menuItems.push({ text: 'Users', icon: <UsersIcon />, to: '/users', show: true });
  }

  if (canAny(['roles:view', 'roles:manage', 'users:manage', '*'])) {
    menuItems.push({ text: 'Roles', icon: <RolesIcon />, to: '/roles', show: true });
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img src="/images/logo.png" alt="Logo" style={{ height: 40, width: 'auto' }} />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Maintenance System
          </Typography>
          <IconButton color="inherit" onClick={handleNotificationClick} size="small">
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Avatar sx={{ ml: 2, width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.95rem' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar sx={{ gap: 1 }}>
          <BuildIcon color="primary" />
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
            Operations
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={NavLink}
                  to={item.to}
                  sx={{
                    borderRadius: 1,
                    '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9375rem' }} />
                </ListItemButton>
              </ListItem>
            ))}
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {user?.roles?.join(' · ')}
          </Typography>
          <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth size="small">
            Logout
          </Button>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleNotificationClose}
        PaperProps={{
          style: { maxHeight: 320, width: 320 },
        }}
      >
        <MenuItem disabled sx={{ opacity: '1 !important', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </MenuItem>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          notifications.map((n) => (
            <MenuItem key={n._id} sx={{ fontWeight: n.is_read ? 'normal' : 600, alignItems: 'flex-start', whiteSpace: 'normal' }}>
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
