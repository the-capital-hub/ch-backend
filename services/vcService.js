import { VCModel } from "../models/VC.js";

export const getVc = async(vcId) =>{
    try{
        const vc = await VCModel.findById(vcId);
        if(!vc){
            throw new Error("VC not found")
        }
        return vc;
    }catch(error){
        return error;
   }
}

    export const addVc = async (vcData) => {
        try{
            const newVc = new VCModel(vcData);
            await newVc.save();
            return newVc;
        }
        catch(error){
            console.log(error);
            return error;
        }

    }

    export const updateVc = async (vcData) => {
        try{
            const vc = await VCModel.findByIdAndUpdate(vcData._id, vcData, { new: true });
            return vc;
        }
        catch(error){
            console.log(error);
            return error;
        }
    }