const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    company: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Lost", "Won"],
      default: "New"
    },

    source: {
      type: String,
      default: "Website"
    },
    followUpDate: {
  type: Date,
  default: null
},

followUpStatus: {
  type: String,
  enum: ["Pending", "Completed", "Cancelled"],
  default: "Pending"
},

notes: {
  type: String,
  trim: true,
  default: ""
},

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Lead", leadSchema);