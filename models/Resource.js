import mongoose from "mongoose";
const resourceSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    link: [{
      type: String,
    }],
    isActive: {
      type: Boolean,
      default: false,
    },
    purchased_users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    }]
  },
  { timestamps: true }
);

export const Resource = mongoose.model('Resource', resourceSchema);
