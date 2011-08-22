function __FileScope__ () {
    this.log = function (object) {
        if (object instanceof Object) {
            console.log("FileScope:");
            console.log(object);
        } else {
            console.log("FileScope: " + object);
        }
    }

    this.fs_init = function (fs) {
        var self = __FileScope__main;
        self.initialized = true;
        self.fs = fs;
        self.log("FileSystem Initialized.");
        chrome.extension.sendRequest({"type" : "init"});
    }

    this.fs_error = function (e) {
        var self = __FileScope__main;
        self.log("Error");
        self.log(e);
    }

    this.fs_list = function () {
        if (!this.reader)
            this.reader = this.fs.root.createReader();
        if (this.busy) {
            // TODO: Should be tested.
            this.log("COVER: 1");
            this.abort = true;
            this.onabort = function () {
                this.fs_list();
            }
            return;
        }
        if (this.abort) {
            this.log("abort");
            this.busy = false;
            this.abort = false;
            if (this.onabort) {
                // TODO: Should be tested.
                this.log("COVER: 2");
                onabort = this.onabort;
                this.onablort = null;
                onabort();
            }
            return;
        }
        this.reader.readEntries(function (results) {
                var self = __FileScope__main;
                if (0 == results.length) {
                    self.abort = true;
                } else {
                    for (var i = 0; i < results.length; i++) {
                        if (i != (results.length - 1))
                            self.send_entry(results[i], null);
                        else
                            self.send_entry(results[i], function() {
                                    self.fs_list();
                                });
                    }
                }
            }, function (e) {
                var self = __FileScope__main;
                // TODO: Should be tested.
                self.log("COVER: 3");
                self.fs_error (e);
                self.abort = true;
                self.fs_list();
            });
    }

    this.fs_chdir = function (dir) {
        this.log("ChDir: " + dir);
        if (dir == '..') {
            var index = this.cwd.lastIndexOf("/", this.cwd.length - 2);
            this.cwd = this.cwd.substr(0, index + 1);
        } else {
            this.cwd += dir + '/';
        }
        this.log("Path: " + this.cwd);
        if (this.busy) {
            this.log("...retry later");
            this.abort = true;
            this.onabort = function () {
                this.fs_chdir(dir);
            }
            return;
        }
        if (this.cwd != '/')
            chrome.extension.sendRequest({"type": "dir", "name": ".."});
        this.busy = true;
        this.fs.root.getDirectory(this.cwd, {create: false}, function (entry) {
                var self = __FileScope__main;
                self.reader = entry.createReader();
                self.busy = false;
                self.abort = false;
                self.fs_list();
            }, function (e) {
                var self = __FileScope__main;
                // TODO: Should be tested.
                self.log("COVER: 4");
                self.fs_error (e);
                self.abort = true;
                self.fs_list();
            });
    }

    this.send_entry = function (entry, callback) {
        var type = entry.isFile ? "file" : "dir";
        this.log("Send: type=" + type + "; name=" + entry.name + "; url=" +
                 entry.toURL());
        chrome.extension.sendRequest({
                "type": type,
                "name": entry.name,
                "url": entry.toURL()
            });
        if (callback)
            callback();
    }

    this._fs_init = function (fs) {
        __FileScope__main.fs_init(fs);
    }

    this._fs_error = function (e) {
        __FileScope__main.fs_error(e);
    }

    this.busy = false;
    this.abort = false;
    this.onabort = null;
    this.reader = null;
    this.cwd = '/';
    this.log("Loaded.");
    // TODO: Choose PERSISTENT or TEMPORARY. HTML5Rocks uses TEMPORARY.
    //window.webkitRequestFileSystem(window.PERSISTENT,
    window.webkitRequestFileSystem(window.TEMPORARY,
                                   1024 * 1024,
                                   this._fs_init,
                                   this._fs_error);
}

var __FileScope__main = new __FileScope__();
