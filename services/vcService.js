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