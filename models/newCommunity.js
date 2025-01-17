import { Schema, model } from "mongoose";

const memberSchema = new Schema ({
  member: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  joined_date: {
    type: Date,
    default: Date.now,
  }
})
 
const productSchema = new Schema({
  name: {
    type:String, 
    required: true
  },
  description: {
    type:String
  },
  is_free:{
    type:Boolean,
    default: true
  },
  amount: {
    type:Number
  },
  image: {
    type: String
  },
  purchased_by: [{
    type: Schema.Types.ObjectId,
    ref: "Users",
  }],
  URLS: [
    {
      type: String
    }
  ]
})
const CommunitySchema = new Schema({
    image:{
        type:String
    },
  name: {
    type: String,
    required: true,
    unique: true
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
   memberSchema
  ],
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: "Posts",
    },
  ],
  products: [
    productSchema
  ],
  terms_and_conditions: [{
    type: String
  }],
  is_deleted: {
    type: Boolean,
    default: false
  },
  deletion_reason: {
    type: String
  },
  deleted_at: {
    type: Date
  },
  whatsapp_group_link: {
    type: String
  },
  removed_members: [{
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Users'
    },
    reason: String,
    removed_at: Date,
    removed_by: {
      type: Schema.Types.ObjectId,
      ref: 'Users'
    }
  }]
},
{
    timestamps: true,
}
);

const community_schema = model('NewCommunities', CommunitySchema);

export default community_schema;