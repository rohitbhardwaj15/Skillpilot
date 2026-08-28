import mongoose from 'mongoose';
const questionSchema = new mongoose.Schema({ question:{type:String,required:true}, options:[String], correctIndex:{type:Number,required:true}, explanation:{type:String,default:''} }, {_id:true});
const assessmentSchema = new mongoose.Schema({ profileId:{type:mongoose.Schema.Types.ObjectId,ref:'Profile',required:true}, skill:{type:String,required:true}, difficulty:{type:String,enum:['beginner','intermediate','advanced'],default:'intermediate'}, questions:[questionSchema], score:{type:Number,min:0,max:100}, correctAnswers:{type:Number,default:0}, completedAt:Date }, {timestamps:true});
export default mongoose.model('Assessment', assessmentSchema);
