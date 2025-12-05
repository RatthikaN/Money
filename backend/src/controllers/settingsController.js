
const Setting = require('../models/Setting');

// Get a specific settings section (e.g., 'general')
exports.getSection = async (req, res) => {
  try {
    const { section } = req.params;
    const setting = await Setting.findByPk(section);
    
    // Return the value if exists, or empty object if not configured yet
    res.json(setting ? setting.value : {});
  } catch (error) {
    console.error(`Error fetching settings for ${req.params.section}:`, error);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
};

// Update or Create a settings section
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    const data = req.body;

    // Upsert (Update if exists, Insert if not)
    const [setting, created] = await Setting.upsert({
      key: section,
      value: data
    });

    res.json({ message: 'Settings saved', data: setting.value });
  } catch (error) {
    console.error(`Error updating settings for ${req.params.section}:`, error);
    res.status(500).json({ message: 'Error saving settings' });
  }
};
