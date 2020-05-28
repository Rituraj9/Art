var mongoose = require("mongoose");

var artSchema = new mongoose.Schema({
	name:String,
	image:String,
	imageId: String,
	description:String,
	created: 
	{
		type:Date, 
		default: Date.now
	},
	user:{
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String,
	},
	comments: [
	{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Comment"
	}
	]
});

module.exports = mongoose.model("Art", artSchema);
