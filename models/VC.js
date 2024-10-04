import { Schema, model } from "mongoose";

const VCSchema = new Schema(
    
{ 
    name:{
    type:String,
    required: true
},
    location:{
        type:String,
        required: true
    },
    stage_focus:[{
        type:String
    }],
    sector_focus:{
        type:String
    },
    ticket_size:{
        type:String
    },
    age:{
        type:Number
    },
    admin:{
        type: Schema.Types.ObjectId,
        ref: "Users",
    },
    people:[{
        type: Schema.Types.ObjectId,
        ref: "Users",
    }],
    description:{
        type:String
    }
},


  {
    timestamps: true,
  }
);


export const VCModel = model("vcs", VCSchema);
