const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { track } = require('@swapnil454/tracepilot');

exports.createUser = async (req, res) => {
  try {
    const { name, email, address, password, role } = req.body;

    if (!name || !email || !address || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, address, password: hashedPassword, role, isVerified: true });

    const userResponse = user.toJSON();
    delete userResponse.password;

    track('user_signup', {
      role: user.role // This allows you to filter dashboards by 'admin' vs 'user' signups
    });

    res.status(201).json({ message: 'User created', user: userResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { name, email, address, role, page = 1, limit = 12, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where = {};
    if (name) where.name = { [Op.iLike]: `%${name}%` };
    if (email) where.email = { [Op.iLike]: `%${email}%` };
    if (address) where.address = { [Op.iLike]: `%${address}%` };
    if (role) where.role = role;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count: filteredCount, rows: users } = await User.findAndCountAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      offset,
      limit: limitNum,
      attributes: { exclude: ['password'] }
    });

    const totalCount = await User.count();

    res.json({
      users,
      totalUsers: totalCount,
      filteredUsers: filteredCount,
      currentPage: pageNum,
      totalPages: Math.ceil(filteredCount / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password, ...updateData } = req.body;
    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ message: 'User updated', user: userResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
