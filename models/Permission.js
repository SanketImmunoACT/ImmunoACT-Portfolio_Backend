const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Permission extends Model {}

Permission.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Permission name (e.g., create_media, edit_publications)'
  },
  
  resource: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Resource type (media, publications, careers, users)'
  },
  
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action type (create, read, update, delete, publish)'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable description of the permission'
  }
}, {
  sequelize,
  modelName: 'Permission',
  tableName: 'permissions',
  timestamps: true,
  
  indexes: [
    {
      fields: ['name'],
      unique: true,
      name: 'idx_permission_name'
    },
    {
      fields: ['resource'],
      name: 'idx_permission_resource'
    },
    {
      fields: ['action'],
      name: 'idx_permission_action'
    },
    {
      fields: ['resource', 'action'],
      name: 'idx_resource_action'
    }
  ]
});

// Role-Permission junction table
class RolePermission extends Model {}

RolePermission.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Role name'
  },
  
  permissionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Permission,
      key: 'id'
    },
    comment: 'Permission ID'
  }
}, {
  sequelize,
  modelName: 'RolePermission',
  tableName: 'role_permissions',
  timestamps: true,
  
  indexes: [
    {
      fields: ['role'],
      name: 'idx_role'
    },
    {
      fields: ['permissionId'],
      name: 'idx_permission_id'
    },
    {
      fields: ['role', 'permissionId'],
      unique: true,
      name: 'idx_role_permission_unique'
    }
  ]
});

// Define associations
RolePermission.belongsTo(Permission, {
  foreignKey: 'permissionId',
  as: 'permission'
});

Permission.hasMany(RolePermission, {
  foreignKey: 'permissionId',
  as: 'rolePermissions'
});

module.exports = { Permission, RolePermission };