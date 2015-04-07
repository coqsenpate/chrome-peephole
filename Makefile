FILES = manifest.json popup.html popup.js content.js icon.png

all: HTML5_FileExplorer.zip

HTML5_FileExplorer.zip: $(FILES)
	mkdir -p archive
	rm -f archive/HTML5_FileExplorer.zip
	zip archive/HTML5_FileExplorer.zip *.js *.json *.html *.png *.css images/*.png fonts/*
