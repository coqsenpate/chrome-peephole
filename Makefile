FILES = manifest.json popup.html popup.js content.js icon.png

all: peephole.zip

peephole.zip: $(FILES)
	mkdir -p archive
	rm -f archive/peephole.zip
	zip archive/peephole.zip *.js *.json *.html *.png *.css images/*.png
