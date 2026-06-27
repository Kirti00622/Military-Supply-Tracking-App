const User = require('../models/User');
const { ROLE_LIST, getRoleLabel } = require('../config/roles');

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, role, assignedBase } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ fullName, email, password, role, assignedBase });
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, assignedBase: user.assignedBase },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateToken();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, assignedBase: user.assignedBase },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      message: 'Profile fetched successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedBase: user.assignedBase,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, assignedBase } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email;
    if (assignedBase) updates.assignedBase = assignedBase;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedBase: user.assignedBase
      }
    });
  } catch (error) {
    next(error);
  }
};

// User Management - Admin only
exports.getUsers = async (req, res, next) => {
  try {
    const { role, assignedBase, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (assignedBase) query.assignedBase = assignedBase;
    if (search) query.$or = [{ fullName: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const usersWithLabels = users.map(u => ({
      id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      roleLabel: getRoleLabel(u.role),
      assignedBase: u.assignedBase,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt
    }));

    res.json({
      success: true,
      message: 'Users fetched successfully',
      data: { users: usersWithLabels, roles: ROLE_LIST, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({
      success: true,
      message: 'User fetched successfully',
      data: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, roleLabel: getRoleLabel(user.role), assignedBase: user.assignedBase, isActive: user.isActive }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({ success: true, message: 'User role updated successfully', data: { id: user._id, role: user.role, roleLabel: getRoleLabel(user.role) } });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin user' });
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
