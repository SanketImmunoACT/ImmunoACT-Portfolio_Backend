const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Media extends Model {
  // Instance method to get safe object for API responses
  toSafeObject() {
    return {
      id: this.id,
      title: this.title,
      link: this.link,
      publishedDate: this.publishedDate,
      sourceName: this.sourceName,
      status: this.status,
      excerpt: this.excerpt,
      imageUrl: this.imageUrl,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy
    };
  }

  // Instance method to get public object for public API responses (no sensitive data)
  toPublicObject() {
    return {
      id: this.id,
      title: this.title,
      link: this.link,
      publishedDate: this.publishedDate,
      sourceName: this.sourceName,
      excerpt: this.excerpt,
      imageUrl: this.imageUrl,
      tags: this.tags,
      publishedAt: this.publishedAt,
      // Format for frontend compatibility
      source: this.sourceName,
      date: this.publishedDate,
      category: this.sourceName // For backward compatibility
    };
  }
}

Media.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      len: [1, 500]
    },
    comment: 'Media article title'
  },
  
  link: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: 'External link to the media article'
  },
  
  publishedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when the article was published by the source'
  },
  
  sourceName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Name of the media source (e.g., Voice of Healthcare)'
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Publication status of the media article'
  },
  
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Brief excerpt or description of the article'
  },
  
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: {
        args: true,
        msg: 'Must be a valid URL'
      }
    },
    comment: 'URL to the article image/thumbnail'
  },
  
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags for categorization'
  },
  
  // SEO and metadata
  metaTitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'SEO meta title'
  },
  
  metaDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'SEO meta description'
  },
  
  // Analytics
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the article was viewed'
  },
  
  clickCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the external link was clicked'
  },
  
  // Audit fields
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who created this media article'
  },
  
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who last modified this media article'
  },
  
  publishedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who published this media article'
  },
  
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the article was published on the website'
  }
}, {
  sequelize,
  modelName: 'Media',
  tableName: 'media',
  timestamps: true,
  
  indexes: [
    {
      fields: ['status'],
      name: 'idx_media_status'
    },
    {
      fields: ['publishedDate'],
      name: 'idx_media_published_date'
    },
    {
      fields: ['sourceName'],
      name: 'idx_media_source_name'
    },
    {
      fields: ['createdBy'],
      name: 'idx_media_created_by'
    },
    {
      fields: ['publishedAt'],
      name: 'idx_media_published_at'
    },
    {
      fields: ['title'],
      name: 'idx_media_title'
    }
  ],
  
  hooks: {
    beforeUpdate: (media) => {
      // Set publishedAt timestamp when status changes to published
      if (media.changed('status') && media.status === 'published' && !media.publishedAt) {
        media.publishedAt = new Date();
      }
    }
  }
});

module.exports = Media;