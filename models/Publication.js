const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Publication extends Model {
  // Instance method to get safe object for API responses
  toSafeObject() {
    return {
      id: this.id,
      title: this.title,
      authors: this.authors,
      journal: this.journal,
      url: this.url,
      publishedDate: this.publishedDate,
      category: this.category,
      buttonText: this.buttonText,
      status: this.status,
      abstract: this.abstract,
      doi: this.doi,
      pmid: this.pmid,
      tags: this.tags,
      imageUrl: this.imageUrl,
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
      authors: this.authors,
      journal: this.journal,
      url: this.url,
      publishedDate: this.publishedDate,
      category: this.category,
      buttonText: this.buttonText,
      abstract: this.abstract,
      doi: this.doi,
      pmid: this.pmid,
      tags: this.tags,
      imageUrl: this.imageUrl,
      publishedAt: this.publishedAt,
      // Format for frontend compatibility
      date: this.publishedDate,
      type: this.buttonText || 'Publication',
      isActive: true // All public publications are active
    };
  }
}

Publication.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000]
    },
    comment: 'Publication title'
  },
  
  authors: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Publication authors (comma-separated or formatted string)'
  },
  
  journal: {
    type: DataTypes.STRING(300),
    allowNull: false,
    validate: {
      len: [1, 300]
    },
    comment: 'Journal or publication venue name'
  },
  
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: 'URL to the publication (PDF, journal page, etc.)'
  },
  
  publishedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when the publication was published'
  },
  
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'Publication category (e.g., Poster, Article, Review)'
  },
  
  buttonText: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'View Publication',
    validate: {
      len: [1, 50]
    },
    comment: 'Text to display on the action button'
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Publication status'
  },
  
  abstract: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Publication abstract or summary'
  },
  
  doi: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      len: [1, 200]
    },
    comment: 'Digital Object Identifier (DOI)'
  },
  
  pmid: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      len: [1, 50]
    },
    comment: 'PubMed ID'
  },
  
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags for categorization'
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
    comment: 'URL to publication thumbnail/cover image'
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
    comment: 'Number of times the publication was viewed'
  },
  
  downloadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the publication was downloaded/accessed'
  },
  
  // Citation information
  citationCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of citations (if available)'
  },
  
  impactFactor: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: true,
    comment: 'Journal impact factor'
  },
  
  // Audit fields
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who created this publication'
  },
  
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who last modified this publication'
  },
  
  publishedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who published this publication'
  },
  
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the publication was published on the website'
  }
}, {
  sequelize,
  modelName: 'Publication',
  tableName: 'publications',
  timestamps: true,
  
  indexes: [
    {
      fields: ['status'],
      name: 'idx_publications_status'
    },
    {
      fields: ['publishedDate'],
      name: 'idx_publications_published_date'
    },
    {
      fields: ['category'],
      name: 'idx_publications_category'
    },
    {
      fields: ['journal'],
      name: 'idx_publications_journal'
    },
    {
      fields: ['createdBy'],
      name: 'idx_publications_created_by'
    },
    {
      fields: ['publishedAt'],
      name: 'idx_publications_published_at'
    },

    {
      fields: ['doi'],
      name: 'idx_publications_doi'
    },
    {
      fields: ['pmid'],
      name: 'idx_publications_pmid'
    }
  ],
  
  hooks: {
    beforeUpdate: (publication) => {
      // Set publishedAt timestamp when status changes to published
      if (publication.changed('status') && publication.status === 'published' && !publication.publishedAt) {
        publication.publishedAt = new Date();
      }
    }
  }
});

module.exports = Publication;