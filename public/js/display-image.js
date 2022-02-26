var loadFile = function(event) {
	var image = document.getElementById('displayed-image');
	image.src = URL.createObjectURL(event.target.files[0]);
};