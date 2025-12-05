const Recurring = require('../models/Recurring');

exports.getRecurring = async (req, res) => {
  try {
    const items = await Recurring.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createRecurring = async (req, res) => {
  try {
    const item = await Recurring.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' });
  }
};

exports.updateRecurring = async (req, res) => {
  try {
    const item = await Recurring.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: 'Update failed' });
  }
};

exports.deleteRecurring = async (req, res) => {
  try {
    const item = await Recurring.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.destroy();
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};