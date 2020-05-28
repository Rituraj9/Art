var mongoose = require("mongoose");

var imageSchema = new mongoose.Schema({
	image: String,
});

module.exports = mongoose.model("Image", imageSchema);