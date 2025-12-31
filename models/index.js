const { sequelize } = require('../config/database');
const { ContactForm, AuditLog } = require('./ContactForm');
const User = require('./User');
const { Permission, RolePermission } = require('./Permission');
const Media = require('./Media');
const Publication = require('./Publication');
const Career = require('./Career');
const Hospital = require('./Hospital');

// Define associations
User.hasMany(ContactForm, {
  foreignKey: 'assignedTo',
  as: 'assignedForms'
});

ContactForm.belongsTo(User, {
  foreignKey: 'assignedTo',
  as: 'assignedUser'
});

// Media associations
User.hasMany(Media, {
  foreignKey: 'createdBy',
  as: 'createdMedia'
});

User.hasMany(Media, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedMedia'
});

Media.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

Media.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier'
});

// Publication associations
User.hasMany(Publication, {
  foreignKey: 'createdBy',
  as: 'createdPublications'
});

User.hasMany(Publication, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedPublications'
});

Publication.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

Publication.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier'
});

// Career associations
User.hasMany(Career, {
  foreignKey: 'createdBy',
  as: 'createdCareers'
});

User.hasMany(Career, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedCareers'
});

Career.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

Career.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier'
});

// Export all models
module.exports = {
  sequelize,
  ContactForm,
  AuditLog,
  User,
  Permission,
  RolePermission,
  Media,
  Publication,
  Career,
  Hospital
};