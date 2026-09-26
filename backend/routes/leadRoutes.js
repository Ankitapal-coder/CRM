const express = require("express");
const Lead = require("../models/Lead");
const User = require("../models/User");

const protect = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE NEW LEAD
router.post("/", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      source,
      followUpDate,
      followUpStatus,
      notes
    } = req.body;

    if (!name || !email || !phone || !company) {
      return res.status(400).json({
        message: "Name, email, phone and company are required"
      });
    }

    const lead = await Lead.create({
  name,
  email,
  phone,
  company,
  source: source || "Website",
  followUpDate: followUpDate || null,
  followUpStatus: followUpStatus || "Pending",
  notes: notes || "",
  createdBy: req.user.userId
});
    res.status(201).json({
      message: "Lead created successfully",
      lead
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create lead",
      error: error.message
    });
  }
});

// GET LEADS BASED ON ROLE
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // ADMIN CAN SEE ALL LEADS
    if (req.user.role === "admin") {
      query = {};
    } 
    // SALES CAN SEE OWN CREATED OR ASSIGNED LEADS
    else {
      query = {
        $or: [
          { createdBy: req.user.userId },
          { assignedTo: req.user.userId }
        ]
      };
    }

    const leads = await Lead.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Leads fetched successfully",
      count: leads.length,
      leads
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch leads",
      error: error.message
    });
  }
});

// UPDATE LEAD STATUS
router.put("/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "New",
      "Contacted",
      "Qualified",
      "Won",
      "Lost"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid lead status"
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found"
      });
    }

    res.status(200).json({
      message: "Lead status updated successfully",
      lead
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update lead status",
      error: error.message
    });
  }
});
// DELETE LEAD
router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const lead = await Lead.findByIdAndDelete(
        req.params.id
      );

      if (!lead) {
        return res.status(404).json({
          message: "Lead not found",
        });
      }

      res.status(200).json({
        message: "Lead deleted successfully",
        lead,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to delete lead",
        error: error.message,
      });
    }
  }
);
// =========================
// UPDATE COMPLETE LEAD
// =========================

router.put("/:id", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      status,
      source,
      followUpDate,
      followUpStatus,
      notes,
    } = req.body;

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        phone,
        company,
        status,
        source,
        followUpDate: followUpDate || null,
        followUpStatus: followUpStatus || "pending",
        notes: notes || "",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedLead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    res.status(200).json({
      message: "Lead updated successfully",
      lead: updatedLead,
    });

  } catch (error) {
    console.error("Update Lead Error:", error);

    res.status(500).json({
      message: "Failed to update lead",
      error: error.message,
    });
  }
});
// ASSIGN LEAD TO SALES USER
router.put("/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { assignedTo } = req.body;

    // Check whether user exists
    const salesUser = await User.findOne({
      _id: assignedTo,
      role: "sales"
    });

    if (!salesUser) {
      return res.status(404).json({
        message: "Sales user not found"
      });
    }

    // Find and assign lead
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: salesUser._id
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate("assignedTo", "name email");

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found"
      });
    }

    res.status(200).json({
      message: "Lead assigned successfully",
      lead
    });

  } catch (error) {
    console.error("Assign Lead Error:", error);

    res.status(500).json({
      message: "Failed to assign lead",
      error: error.message
    });
  }
});

module.exports = router;