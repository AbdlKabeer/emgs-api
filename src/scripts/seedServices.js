const mongoose = require('mongoose');
const Service = require('../models/service.model'); // Adjust path as needed

// MongoDB connection string and user ID
const MONGODB_URI = 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '67e058a0d9592e9ccb95af9f';

// Services data - ONLY the services shown in the mobile app screenshots
const servicesData = [
  {
    name: 'EMGS CONSULTATION DEPT',
    description: 'Get expert guidance and prep resources for the NCLEX exam, including study plans, practice materials, and personalized support.',
    features: [
      'OSCE, CBT, OET Training',
      'NCLEX Coaching & Registration',
      'Personalized Study Plans',
      'Practice Materials & Mock Tests',
    ],
    category: 'NCLEX Services',
    whatsappContact: '+2348123456789', // Replace with actual WhatsApp contact
    price: 35000,
    isActive: true,
    autoResponderMessage: "Thank you for your interest in EMGS Consultation services. Our expert team will guide you through your NCLEX preparation journey. We'll get back to you shortly!",
    user: USER_ID
  },
  {
    name: 'EMGS INTERVIEW PREPARATION',
    description: 'Comprehensive interview preparation service to help you ace your medical interviews with confidence and professional guidance.',
    features: [
      'Mock Interview Sessions',
      'Common Healthcare Interview Questions',
      'Professional Communication Training',
      'Body Language & Presentation Skills',
      'Interview Strategy Planning',
      'Follow-up Support'
    ],
    category: 'NCLEX Services',
    whatsappContact: '+2348123456789',
    price: 25000,
    isActive: true,
    autoResponderMessage: "Thank you for choosing our Interview Preparation service. We'll help you build confidence and excel in your interviews. Our team will contact you soon!",
    user: USER_ID
  },
  {
    name: 'EMGS JOB APPLICATION',
    description: 'Professional job application assistance for healthcare professionals seeking opportunities abroad.',
    features: [
      'Job Search & Matching',
      'Application Form Completion',
      'Cover Letter Writing',
      'Interview Scheduling Assistance',
      'Follow-up Communication'
    ],
    category: 'Job Application',
    whatsappContact: '+2348123456789',
    price: 20000,
    isActive: true,
    autoResponderMessage: "Thank you for your interest in our Job Application service. We'll help you secure your dream healthcare position. Expect our call soon!",
    user: USER_ID
  },
  {
    name: 'EMGS STUDY ABROAD & SCHOLARSHIPS',
    description: 'Complete guidance for studying abroad programs and scholarship opportunities for healthcare students and professionals.',
    features: [
      'University Selection Guidance',
      'Scholarship Search & Application',
      'Admission Requirements Planning',
      'Document Preparation Support',
      'Application Deadline Management',
      'Financial Planning Assistance'
    ],
    category: 'Visa Booking',
    whatsappContact: '+2348123456789',
    price: 40000,
    isActive: true,
    autoResponderMessage: "Thank you for your interest in Study Abroad & Scholarships. We'll help you find the best opportunities for your educational journey. Our team will reach out shortly!",
    user: USER_ID
  },
  {
    name: 'EMGS POF',
    description: 'Professional assistance with Proof of Funds documentation for visa applications and educational purposes.',
    features: [
      'Bank Statement Preparation',
      'Financial Documentation Review',
      'Sponsor Letter Drafting',
      'Investment Portfolio Documentation',
      'Currency Conversion Calculations',
      'Embassy-Compliant Formatting'
    ],
    category: 'Proof of Funds',
    whatsappContact: '+2348123456789',
    price: 15000,
    isActive: true,
    autoResponderMessage: "Thank you for choosing our POF service. We'll help you prepare comprehensive Proof of Funds documentation. Our team will contact you soon!",
    user: USER_ID
  },
  {
    name: 'EMGS VISA APPLICATION DPT',
    description: 'Complete visa application support and documentation assistance for healthcare professionals.',
    features: [
      'Visa Type Assessment',
      'Document Checklist Preparation',
      'Form Completion Assistance',
      'Appointment Booking Support',
      'Embassy Interview Preparation',
      'Application Status Tracking'
    ],
    category: 'Visa Booking',
    whatsappContact: '+2348123456789',
    price: 30000,
    isActive: true,
    autoResponderMessage: "Thank you for your interest in our Visa Application services. We'll guide you through the entire visa process. Expect our call shortly!",
    user: USER_ID
  },
  {
    name: 'EMGS CV & SUPPORTING INFORMATION DRAFTING.',
    description: 'Professional CV writing and supporting documentation service tailored for healthcare professionals.',
    features: [
      'Professional CV Writing',
      'Personal Statement Drafting',
      'Work Experience Optimization',
      'Skills & Qualifications Highlighting',
      'Reference Letter Support',
      'ATS-Optimized Formatting'
    ],
    category: 'Job Application',
    whatsappContact: '+2348123456789',
    price: 18000,
    isActive: true,
    autoResponderMessage: "Thank you for choosing our CV & Documentation service. We'll create a compelling professional profile for you. Our team will reach out soon!",
    user: USER_ID
  }
];

async function seedServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🚀 Connected to MongoDB successfully!');

    // Clear existing services (optional - remove if you want to keep existing data)
    console.log('🧹 Clearing existing services...');
    await Service.deleteMany({});

    // Insert new services
    console.log('📝 Inserting new services...');
    const insertedServices = await Service.insertMany(servicesData);
    
    console.log(`✅ Successfully seeded ${insertedServices.length} services!`);
    console.log('📋 Services created:');
    
    insertedServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - ₦${service.price?.toLocaleString() || 'Price not set'} (${service.category})`);
    });

  } catch (error) {
    console.error('❌ Error seeding services:', error);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeding function
seedServices();