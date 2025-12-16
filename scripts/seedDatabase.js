require('dotenv').config();
const { sequelize, User, Permission, RolePermission, Media, Publication, Career } = require('../models');
const logger = require('../config/logger');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Sync database - force recreate for clean setup
    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized');

    // Create permissions
    const permissions = [
      // Media permissions
      { name: 'create_media', resource: 'media', action: 'create', description: 'Create new media articles' },
      { name: 'read_media', resource: 'media', action: 'read', description: 'View media articles' },
      { name: 'update_media', resource: 'media', action: 'update', description: 'Edit media articles' },
      { name: 'delete_media', resource: 'media', action: 'delete', description: 'Delete media articles' },
      { name: 'publish_media', resource: 'media', action: 'publish', description: 'Publish/unpublish media articles' },

      // Publications permissions
      { name: 'create_publications', resource: 'publications', action: 'create', description: 'Create new publications' },
      { name: 'read_publications', resource: 'publications', action: 'read', description: 'View publications' },
      { name: 'update_publications', resource: 'publications', action: 'update', description: 'Edit publications' },
      { name: 'delete_publications', resource: 'publications', action: 'delete', description: 'Delete publications' },
      { name: 'publish_publications', resource: 'publications', action: 'publish', description: 'Publish/unpublish publications' },

      // Careers permissions
      { name: 'create_careers', resource: 'careers', action: 'create', description: 'Create new job postings' },
      { name: 'read_careers', resource: 'careers', action: 'read', description: 'View job postings' },
      { name: 'update_careers', resource: 'careers', action: 'update', description: 'Edit job postings' },
      { name: 'delete_careers', resource: 'careers', action: 'delete', description: 'Delete job postings' },
      { name: 'publish_careers', resource: 'careers', action: 'publish', description: 'Publish/unpublish job postings' },

      // User management permissions
      { name: 'create_users', resource: 'users', action: 'create', description: 'Create new users' },
      { name: 'read_users', resource: 'users', action: 'read', description: 'View users' },
      { name: 'update_users', resource: 'users', action: 'update', description: 'Edit users' },
      { name: 'delete_users', resource: 'users', action: 'delete', description: 'Delete users' },

      // Contact form permissions
      { name: 'read_contacts', resource: 'contacts', action: 'read', description: 'View contact form submissions' },
      { name: 'update_contacts', resource: 'contacts', action: 'update', description: 'Update contact form status' },
      { name: 'delete_contacts', resource: 'contacts', action: 'delete', description: 'Delete contact form submissions' }
    ];

    for (const permission of permissions) {
      await Permission.findOrCreate({
        where: { name: permission.name },
        defaults: permission
      });
    }
    console.log('✅ Permissions created');

    // Create role-permission mappings
    const rolePermissions = [
      // Super Admin - all permissions
      { role: 'super_admin', permissions: permissions.map(p => p.name) },

      // Office Executive - media and publications
      { 
        role: 'office_executive', 
        permissions: [
          'create_media', 'read_media', 'update_media', 'delete_media', 'publish_media',
          'create_publications', 'read_publications', 'update_publications', 'delete_publications', 'publish_publications',
          'read_contacts', 'update_contacts'
        ]
      },

      // HR Manager - careers only
      { 
        role: 'hr_manager', 
        permissions: [
          'create_careers', 'read_careers', 'update_careers', 'delete_careers', 'publish_careers',
          'read_contacts', 'update_contacts'
        ]
      }
    ];

    for (const rolePermission of rolePermissions) {
      for (const permissionName of rolePermission.permissions) {
        const permission = await Permission.findOne({ where: { name: permissionName } });
        if (permission) {
          await RolePermission.findOrCreate({
            where: {
              role: rolePermission.role,
              permissionId: permission.id
            },
            defaults: {
              role: rolePermission.role,
              permissionId: permission.id
            }
          });
        }
      }
    }
    console.log('✅ Role permissions assigned');

    // Create default super admin user
    const defaultAdmin = {
      username: 'admin',
      email: 'admin@immunoact.com',
      password: 'Admin@123456', // Should be changed after first login
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true
    };

    const [adminUser, created] = await User.findOrCreate({
      where: { username: defaultAdmin.username },
      defaults: defaultAdmin
    });

    if (created) {
      console.log('✅ Default super admin user created');
      console.log('📧 Username: admin');
      console.log('🔑 Password: Admin@123456');
      console.log('⚠️  Please change the default password after first login!');
    } else {
      console.log('ℹ️  Super admin user already exists');
    }

    // Create sample users for testing
    const sampleUsers = [
      {
        username: 'officeexec',
        email: 'office@immunoact.com',
        password: 'Office@123456',
        firstName: 'Office',
        lastName: 'Executive',
        role: 'office_executive',
        isActive: true
      },
      {
        username: 'hrmanager',
        email: 'hr@immunoact.com',
        password: 'HR@123456',
        firstName: 'HR',
        lastName: 'Manager',
        role: 'hr_manager',
        isActive: true
      }
    ];

    for (const userData of sampleUsers) {
      const [user, created] = await User.findOrCreate({
        where: { username: userData.username },
        defaults: userData
      });

      if (created) {
        console.log(`✅ Sample user created: ${userData.username}`);
      }
    }

    // Create sample media articles
    const sampleMedia = [
      {
        title: 'PM Modi Unveils India\'s First Indigenous CAR-T Cancer Therapy \'NexCAR19\'',
        link: 'https://voiceofhealthcare.com/news/pm-modi-unveils-nexcar19/',
        publishedDate: new Date('2024-11-08'),
        sourceName: 'Voice of Healthcare',
        status: 'published',
        excerpt: 'Prime Minister Narendra Modi unveiled India\'s first indigenous CAR-T cell therapy for blood cancer treatment.',
        createdBy: 2, // Office executive
        publishedBy: 2,
        publishedAt: new Date('2024-11-08')
      },
      {
        title: 'Indian-Made Gene Therapy For Blood Cancer Shows 73% Response Rate in Clinical Trials',
        link: 'https://economictimes.com/news/nexcar19-clinical-trials',
        publishedDate: new Date('2024-10-17'),
        sourceName: 'The Economic Times',
        status: 'published',
        excerpt: 'ImmunoACT\'s NexCAR19 demonstrates promising results in clinical trials with high response rates.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2024-10-17')
      },
      {
        title: 'Gene therapy for blood cancer shows 73 per cent response rate in clinical trials',
        link: 'https://hindustan-times.com/nexcar19-gene-therapy',
        publishedDate: new Date('2024-10-17'),
        sourceName: 'Hindustan Times',
        status: 'published',
        excerpt: 'Clinical trials show encouraging results for India\'s indigenous CAR-T cell therapy.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2024-10-17')
      }
    ];

    for (const mediaData of sampleMedia) {
      await Media.findOrCreate({
        where: { title: mediaData.title },
        defaults: mediaData
      });
    }
    console.log('✅ Sample media articles created');

    // Create sample publications
    const samplePublications = [
      {
        title: 'Quality control measures in CAR-T cell manufacturing: Indian perspective',
        authors: 'Dr. Rahul Purwar, Dr. Pankaj Chaudhary, ImmunoACT Team',
        journal: 'Journal of Cancer Research',
        url: 'https://immunoact.com/wp-content/uploads/2023/quality-control-car-t.pdf',
        publishedDate: new Date('2023-01-15'),
        category: 'Poster',
        buttonText: 'View Poster',
        status: 'published',
        abstract: 'This study presents comprehensive quality control measures implemented in CAR-T cell manufacturing processes, focusing on the Indian healthcare context and regulatory requirements.',
        doi: '10.1234/jcr.2023.001',
        createdBy: 2, // Office executive
        publishedBy: 2,
        publishedAt: new Date('2023-01-15')
      },
      {
        title: 'Real World Data of the safety and efficacy of Terlipressin Autologous Plus Obinutuzumab As Bridging Therapy Prior To Terlipressin Autologous / Obinutuzumab in relapsed / refractory CD19+ CAR-T cell therapy in India: a real-world experience',
        authors: 'Dr. Mayur Parihar, Dr. Sameer Bakhshi, Dr. Lalit Kumar, ImmunoACT Research Team',
        journal: 'European Hematology Association Congress',
        url: 'https://immunoact.com/wp-content/uploads/2023/real-world-data-car-t.pdf',
        publishedDate: new Date('2023-05-10'),
        category: 'Poster',
        buttonText: 'View Poster',
        status: 'published',
        abstract: 'Real-world evidence demonstrating the safety and efficacy of CAR-T cell therapy in Indian patients with relapsed/refractory CD19+ hematological malignancies.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2023-05-10')
      },
      {
        title: 'Safety And Efficacy Of Relatlimab Activated Plus Obinutuzumab As Bridging Therapy Prior To Terlipressin Autologous in relapsed / refractory CD19+ CAR-T cell therapy',
        authors: 'Dr. Pankaj Chaudhary, Dr. Rahul Purwar, Clinical Research Team',
        journal: 'American Society of Hematology',
        url: 'https://immunoact.com/wp-content/uploads/2023/safety-efficacy-car-t.pdf',
        publishedDate: new Date('2023-08-17'),
        category: 'Poster',
        buttonText: 'View Poster',
        status: 'published',
        abstract: 'Clinical study evaluating the safety and efficacy of combination therapy as a bridge to CAR-T cell treatment in patients with relapsed/refractory CD19+ malignancies.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2023-08-17')
      },
      {
        title: 'Development and clinical trial of nationwide implementation of affordable CAR-T cell therapy in India: a real-world experience Poster',
        authors: 'ImmunoACT Clinical Team, Dr. Mayur Parihar, Dr. Sameer Bakhshi',
        journal: 'International Society for Cell & Gene Therapy',
        url: 'https://immunoact.com/wp-content/uploads/2023/development-clinical-trial.pdf',
        publishedDate: new Date('2023-09-15'),
        category: 'Poster',
        buttonText: 'View Poster',
        status: 'published',
        abstract: 'Comprehensive overview of the development and implementation of affordable CAR-T cell therapy across India, including clinical trial results and real-world outcomes.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2023-09-15')
      },
      {
        title: 'Bridging the Gap: Immunomodulatory Bridging Prior To Terlipressin Autologous in relapsed / refractory CD19+ CAR-T cell therapy',
        authors: 'Dr. Lalit Kumar, Dr. Pankaj Chaudhary, Translational Research Team',
        journal: 'European Hematology Association Congress',
        url: 'https://immunoact.com/wp-content/uploads/2023/bridging-gap-immunomodulatory.pdf',
        publishedDate: new Date('2023-04-22'),
        category: 'Poster',
        buttonText: 'View Poster',
        status: 'published',
        abstract: 'Investigation of immunomodulatory bridging strategies to optimize patient outcomes prior to CAR-T cell therapy in relapsed/refractory CD19+ malignancies.',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2023-04-22')
      },
      {
        title: 'Novel CD19 CAR-T Cells: Psychosocial, physiological, Educational needs in relapsed / refractory CD19+ CAR-T cell therapy',
        authors: 'Dr. Rahul Purwar, Patient Care Team, Clinical Psychology Department',
        journal: 'Journal of Psycho-Oncology',
        url: 'https://immunoact.com/wp-content/uploads/2023/novel-cd19-car-t-psychosocial.pdf',
        publishedDate: new Date('2023-06-30'),
        category: 'Article',
        buttonText: 'View Article',
        status: 'published',
        abstract: 'Comprehensive analysis of psychosocial, physiological, and educational needs of patients undergoing CAR-T cell therapy, with focus on holistic patient care.',
        doi: '10.1234/jpo.2023.015',
        createdBy: 2,
        publishedBy: 2,
        publishedAt: new Date('2023-06-30')
      }
    ];

    for (const publicationData of samplePublications) {
      await Publication.findOrCreate({
        where: { title: publicationData.title },
        defaults: publicationData
      });
    }
    console.log('✅ Sample publications created');

    // Create sample careers
    const sampleCareers = [
      {
        title: 'Senior Manager',
        department: 'Management',
        location: 'Mumbai, India',
        employmentType: 'full-time',
        experienceLevel: 'senior-level',
        salaryRange: '₹15,00,000 - ₹25,00,000 per annum',
        description: 'We are seeking an experienced Senior Manager to lead our operations and drive strategic initiatives in the CAR-T cell therapy domain.',
        responsibilities: [
          'Lead cross-functional teams to achieve business objectives',
          'Develop and implement strategic plans for operational excellence',
          'Manage budgets and resource allocation effectively',
          'Collaborate with senior leadership on key decisions',
          'Drive process improvements and operational efficiency'
        ],
        requirements: [
          'MBA or equivalent advanced degree',
          '8+ years of management experience in healthcare/biotech',
          'Strong leadership and communication skills',
          'Experience with regulatory compliance in healthcare',
          'Proven track record of team management'
        ],
        qualifications: [
          'Advanced degree in Business Administration, Life Sciences, or related field',
          'Experience in pharmaceutical or biotechnology industry',
          'Knowledge of CAR-T cell therapy or oncology preferred',
          'Strong analytical and problem-solving skills'
        ],
        benefits: [
          'Competitive salary and performance bonuses',
          'Comprehensive health insurance',
          'Professional development opportunities',
          'Flexible working arrangements',
          'Employee stock options'
        ],
        applicationDeadline: new Date('2025-02-28'),
        status: 'active',
        isRemote: false,
        tags: ['management', 'healthcare', 'biotech', 'leadership'],
        applicationEmail: 'careers@immunoact.com',
        urgency: 'high',
        workSchedule: '9:00 AM - 6:00 PM, Monday to Friday',
        travelRequired: true,
        createdBy: 3, // HR manager
        publishedBy: 3,
        publishedAt: new Date()
      },
      {
        title: 'Key Account Manager',
        department: 'Sales',
        location: 'Delhi, India',
        employmentType: 'full-time',
        experienceLevel: 'mid-level',
        salaryRange: '₹8,00,000 - ₹12,00,000 per annum',
        description: 'Join our sales team as a Key Account Manager to build and maintain relationships with key healthcare institutions and drive business growth.',
        responsibilities: [
          'Manage relationships with key healthcare accounts',
          'Develop and execute account strategies',
          'Identify new business opportunities',
          'Collaborate with clinical teams on customer needs',
          'Achieve sales targets and KPIs'
        ],
        requirements: [
          'Bachelor\'s degree in Life Sciences, Business, or related field',
          '3-5 years of experience in pharmaceutical/biotech sales',
          'Strong relationship building skills',
          'Knowledge of oncology or cell therapy markets',
          'Excellent presentation and negotiation skills'
        ],
        qualifications: [
          'Experience in B2B healthcare sales',
          'Understanding of hospital procurement processes',
          'Ability to work independently and manage territory',
          'Strong communication and interpersonal skills'
        ],
        benefits: [
          'Competitive base salary plus commission',
          'Health and dental insurance',
          'Travel allowances',
          'Performance incentives',
          'Career advancement opportunities'
        ],
        applicationDeadline: new Date('2025-01-31'),
        status: 'active',
        isRemote: false,
        tags: ['sales', 'account-management', 'healthcare', 'b2b'],
        applicationEmail: 'careers@immunoact.com',
        urgency: 'medium',
        workSchedule: 'Flexible hours with travel requirements',
        travelRequired: true,
        createdBy: 3,
        publishedBy: 3,
        publishedAt: new Date()
      },
      {
        title: 'Clinical Research Associate',
        department: 'Clinical Research',
        location: 'Bangalore, India',
        employmentType: 'full-time',
        experienceLevel: 'entry-level',
        salaryRange: '₹4,00,000 - ₹6,00,000 per annum',
        description: 'Exciting opportunity for a Clinical Research Associate to join our clinical trials team and contribute to groundbreaking CAR-T cell therapy research.',
        responsibilities: [
          'Support clinical trial operations and monitoring',
          'Ensure compliance with GCP and regulatory requirements',
          'Assist in patient recruitment and enrollment',
          'Maintain clinical trial documentation',
          'Coordinate with investigators and study sites'
        ],
        requirements: [
          'Bachelor\'s degree in Life Sciences, Pharmacy, or related field',
          '0-2 years of experience in clinical research',
          'Knowledge of GCP guidelines',
          'Strong attention to detail and organizational skills',
          'Good written and verbal communication skills'
        ],
        qualifications: [
          'Clinical research certification preferred',
          'Understanding of regulatory requirements',
          'Proficiency in MS Office and clinical databases',
          'Ability to work in a fast-paced environment'
        ],
        benefits: [
          'Competitive starting salary',
          'Comprehensive training program',
          'Health insurance coverage',
          'Learning and development opportunities',
          'Mentorship programs'
        ],
        applicationDeadline: new Date('2025-01-15'),
        status: 'active',
        isRemote: false,
        tags: ['clinical-research', 'entry-level', 'gcp', 'trials'],
        applicationEmail: 'careers@immunoact.com',
        urgency: 'medium',
        workSchedule: '9:00 AM - 5:30 PM, Monday to Friday',
        travelRequired: false,
        createdBy: 3,
        publishedBy: 3,
        publishedAt: new Date()
      },
      {
        title: 'Regulatory Affairs Specialist',
        department: 'Regulatory Affairs',
        location: 'Mumbai, India',
        employmentType: 'full-time',
        experienceLevel: 'mid-level',
        salaryRange: '₹10,00,000 - ₹15,00,000 per annum',
        description: 'We are looking for a Regulatory Affairs Specialist to ensure compliance with regulatory requirements and support product approvals.',
        responsibilities: [
          'Prepare and submit regulatory filings',
          'Interact with regulatory authorities',
          'Ensure compliance with local and international regulations',
          'Support clinical trial regulatory activities',
          'Maintain regulatory documentation and databases'
        ],
        requirements: [
          'Bachelor\'s/Master\'s degree in Life Sciences, Pharmacy, or related field',
          '3-5 years of regulatory affairs experience',
          'Knowledge of CDSCO, FDA, and EMA regulations',
          'Experience with cell and gene therapy regulations preferred',
          'Strong analytical and writing skills'
        ],
        qualifications: [
          'Regulatory affairs certification (RAC) preferred',
          'Experience in pharmaceutical or biotech industry',
          'Understanding of clinical trial regulations',
          'Excellent project management skills'
        ],
        benefits: [
          'Competitive salary package',
          'Performance-based bonuses',
          'Health and life insurance',
          'Professional certification support',
          'Flexible work arrangements'
        ],
        applicationDeadline: new Date('2025-02-15'),
        status: 'active',
        isRemote: true,
        tags: ['regulatory-affairs', 'compliance', 'cdsco', 'fda'],
        applicationEmail: 'careers@immunoact.com',
        urgency: 'high',
        workSchedule: 'Flexible hours with core overlap',
        travelRequired: false,
        createdBy: 3,
        publishedBy: 3,
        publishedAt: new Date()
      },
      {
        title: 'Quality Assurance Manager',
        department: 'Quality Assurance',
        location: 'Hyderabad, India',
        employmentType: 'full-time',
        experienceLevel: 'senior-level',
        salaryRange: '₹12,00,000 - ₹18,00,000 per annum',
        description: 'Lead our Quality Assurance team to ensure the highest standards in CAR-T cell therapy manufacturing and clinical operations.',
        responsibilities: [
          'Develop and implement QA policies and procedures',
          'Oversee quality control activities and testing',
          'Ensure GMP compliance in manufacturing',
          'Lead quality investigations and CAPA processes',
          'Manage QA team and training programs'
        ],
        requirements: [
          'Bachelor\'s/Master\'s degree in Life Sciences, Chemistry, or related field',
          '6+ years of QA experience in pharmaceutical/biotech',
          'Strong knowledge of GMP, GLP, and GCP',
          'Experience with cell therapy or biologics preferred',
          'Leadership and team management experience'
        ],
        qualifications: [
          'Quality management certification preferred',
          'Experience with regulatory inspections',
          'Knowledge of quality management systems',
          'Strong problem-solving and analytical skills'
        ],
        benefits: [
          'Competitive salary and benefits package',
          'Leadership development programs',
          'Health insurance for family',
          'Performance incentives',
          'Professional growth opportunities'
        ],
        applicationDeadline: new Date('2025-03-01'),
        status: 'draft',
        isRemote: false,
        tags: ['quality-assurance', 'gmp', 'management', 'biologics'],
        applicationEmail: 'careers@immunoact.com',
        urgency: 'medium',
        workSchedule: '8:30 AM - 5:30 PM, Monday to Friday',
        travelRequired: false,
        createdBy: 3
      }
    ];

    for (const careerData of sampleCareers) {
      await Career.findOrCreate({
        where: { title: careerData.title, department: careerData.department },
        defaults: careerData
      });
    }
    console.log('✅ Sample careers created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('Super Admin - Username: admin, Password: Admin@123456');
    console.log('Office Executive - Username: officeexec, Password: Office@123456');
    console.log('HR Manager - Username: hrmanager, Password: HR@123456');
    console.log('\n⚠️  Please change all default passwords after first login!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    logger.error('Database seeding error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;