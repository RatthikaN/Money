const Incoming = require('../models/Incoming');

exports.getIncoming = async (req, res) => {
  try {
    const incoming = await Incoming.findAll({ order: [['date', 'DESC']] });
    res.json(incoming);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createIncoming = async (req, res) => {
  try {
    const incoming = await Incoming.create(req.body);
    res.status(201).json(incoming);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error });
  }
};

exports.updateIncoming = async (req, res) => {
  try {
    const incoming = await Incoming.findByPk(req.params.id);
    if (!incoming) return res.status(404).json({ message: 'Record not found' });

    await incoming.update(req.body);
    res.json(incoming);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error });
  }
};

exports.deleteIncoming = async (req, res) => {
  try {
    const incoming = await Incoming.findByPk(req.params.id);
    if (!incoming) return res.status(404).json({ message: 'Record not found' });

    await incoming.destroy();
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};