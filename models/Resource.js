import mongoose from "mongoose";

const linkSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  url: {
    type: String,
  }
});

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
      link: [linkSchema],
    logoType: {
      type: String,
      enum: ['gtm', 'sales', 'pitch', 'financial'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

export const Resource = mongoose.model('Resource', resourceSchema);
