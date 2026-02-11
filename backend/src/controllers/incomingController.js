const Incoming = require('../models/Incoming');
const IncomingItem = require('../models/IncomingItem');

exports.getIncoming = async (req, res) => {
  try {
    const incoming = await Incoming.findAll({
      include: [{ model: IncomingItem, as: 'items' }],
      order: [['date', 'DESC']]
    });
    res.json(incoming);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createIncoming = async (req, res) => {
  try {
    const { items, ...incomingData } = req.body;
    const incoming = await Incoming.create(incomingData);

    if (items && items.length > 0) {
      await Promise.all(items.map(item =>
        IncomingItem.create({ ...item, IncomingId: incoming.id })
      ));
    }

    const createdIncoming = await Incoming.findByPk(incoming.id, {
      include: [{ model: IncomingItem, as: 'items' }]
    });
    res.status(201).json(createdIncoming);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.updateIncoming = async (req, res) => {
  try {
    const { items, ...updateData } = req.body;
    const incoming = await Incoming.findByPk(req.params.id);
    if (!incoming) return res.status(404).json({ message: 'Record not found' });

    await incoming.update(updateData);

    if (items) {
      await IncomingItem.destroy({ where: { IncomingId: incoming.id } });
      if (items.length > 0) {
        await Promise.all(items.map(item =>
          IncomingItem.create({ ...item, IncomingId: incoming.id })
        ));
      }
    }

    const updatedIncoming = await Incoming.findByPk(incoming.id, {
      include: [{ model: IncomingItem, as: 'items' }]
    });
    res.json(updatedIncoming);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
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