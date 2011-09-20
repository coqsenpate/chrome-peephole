function show_log(str) {
    console.log.bind(console, 'Peephole:')(str);
}

function fs_init(filesystem) {
    fs = filesystem;
    show_log('FileSystem Initialized.');
    chrome.extension.sendRequest({'type' : 'init'});
}

function fs_error(e) {
    show_log('Error');
    show_log(e);
}

function fs_list(func) {
    if (!busy) throw 'fs_list is called without lock.';
    reader.readEntries(function(results) {
    show_log(results);
            if (results.length == 0) {
                unlock();
                return;
            }
            currentPendingEntries = results.length;
            for (var i = 0; i < results.length; i++) {
                if (func)
                    func(results[i]);
            }
            fs_list(func);
        }, function(e) {
            unlock();
            fs_error(e);
        });
}

function init_list() {
    if (!lock()) return;

    reader = fs.root.createReader();
    show_log('createReader');
    check_usage(fstype);

    fs_list(send_entry);
}

function change_dir(dir) {
    show_log('ChDir: ' + dir);
    if (!lock()) return;

    fs.root.getDirectory(dir, {create: false}, function(entry) {
            reader = entry.createReader();
            fs_list(send_entry);
        }, function(e) {
            unlock();
            fs_error(e);
        });
}

function send_entry(entry) {
    if (entry.isFile) {
        entry.file(function(newFile) {
            var request = {
                'type': 'file',
                'name': entry.name,
                'size': newFile.size,
                'path': entry.fullPath,
                'url': entry.toURL()
            };

            show_log('currentPendingEntries = ' +
                            currentPendingEntries);
            show_log('Send: ', request);
            chrome.extension.sendRequest(request);
            check_send_all(entry);
        }.bind(this));
    } else {
        var request = {
            'type': 'dir',
            'name': entry.name,
            'path': entry.fullPath,
            'url': entry.toURL()
        };
        show_log('currentPendingEntries = ' +
                        currentPendingEntries);
        show_log('Send: ', request);
        chrome.extension.sendRequest(request);
        check_send_all(entry);
    }
}

function check_send_all(entry) {
    if (--currentPendingEntries == 0) {
        chrome.extension.sendRequest({
            'path' : entry.fullPath,
            'type' : 'show'
        });
    }
}

function change_type(type) {
    if (!lock()) return;

    unlock();
    reader = null;
    fstype = type;

    window.webkitRequestFileSystem(
        fstype,
        1024 * 1024,
        fs_init,
        fs_error
    );
}

function delete_all() {
    show_log('delete_all');
    if (!lock()) return;

    reader = fs.root.createReader();

    fs_list(remove_file);
}

function remove_file(entry) {
    show_log('remove entry');
    if (entry.isFile) {
        entry.remove(function() {
            show_log('File Removed');
        }, fs_error);
    } else {
        entry.removeRecursively(function() {
            show_log('Dir Removed');
        }, fs_error);
    }
}

function check_usage(type) {
    fstype = type;
    show_log('fstype: ' + fstype);
    webkitStorageInfo.queryUsageAndQuota(
        fstype,
        function(usage, quota) {
            chrome.extension.sendRequest({
            'type' : 'usage',
            'usage': usage,
            'quota': quota
            });
        }, fs_error);
}

function lock() {
    if (busy) return false;
    busy = true;
    return true;
}

function unlock() {
    busy = false;
    chrome.extension.sendRequest({
        'type' : 'not busy',
    });
}

var busy = false;
var reader = null;
var fstype = window.TEMPORARY;
var fs = null;
show_log('Loaded.');

window.webkitRequestFileSystem(
    fstype,
    1024 * 1024,
    fs_init,
    fs_error
);

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        show_log(request);
        if (request.func == 'init_list') {
            init_list();
        } else if (request.func == 'change_dir') {
            change_dir(request.param);
        } else if (request.func == 'change_type') {
            change_type(request.param);
        } else {
            delete_all();
        }
    }
);
