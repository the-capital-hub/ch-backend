import { Schema, model } from "mongoose";

const CommunitySchema = new Schema({
    image:{
        type:String
    },
  name: {
    type: String,
    required: true,
  },
  size: {
    type:String
  } , 
  subscription: {
    type: String,
    enum: ['paid', 'free'],
    required: true
  },
  amount: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return this.subscription === 'free' ? value === null : value > 0;
      },
      message: 'Amount must be greater than 0 if subscription is "paid" or null if subscription is "free".'
    }
  },
  about: {
    type: String,
  },
  adminId: {
    type: Schema.Types.ObjectId,
      ref: "Users",
  },
  isOpen:{
    type:Boolean,
    default: false
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
  ],

},
{
    timestamps: true,
}
);

const community_schema = model('NewCommunities', CommunitySchema);

export default community_schema;