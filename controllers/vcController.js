import { VCModel } from "../models/VC.js";
import { addVc, getVc } from "../services/vcService.js";

 export const getVcController = async(req,res)=>{
    try{
        const {vcId} = req.body;
        const response = await getVc(vcId);
        res.status(200).send(response);
    }
    catch(error){
console.log(error);
res.status(500).send(error);
    }
 }

 export const addVcController = async(req,res)=>{
    try{
        const vcData = req.body;
        const response = await addVc(vcData);
        res.send({status:true, message: "Vc added", data:response})
    }
    catch(error){
        console.log(error);
        res.send({status:false, message:"an error occured", data: error});
    }
 }