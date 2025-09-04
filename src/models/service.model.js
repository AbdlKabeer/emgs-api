const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: [
        'Job Application', 
        'IELTS Masterclass', 
        'Parcel Services', 
        'Flight Booking', 
        'Visa Booking', 
        'Loan Services', 
        'NCLEX Services', 
        'CBT Services', 
        'OET Services', 
        'OSCE Services',
        'Proof of Funds'
      ],
      required: true 
    },
    whatsappContact: { type: String, required: true },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
    autoResponderMessage: { 
      type: String, 
      default: "Thank you for reaching out. We'll get back to you shortly!" 
    },
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;

