chrome.extension.onConnect.addListener(function(port) {
var listener = arguments.callee;
console.log('connected:', arguments);

function show_log(str) {
    console.log.bind(console, 'Peephole (content):')(str);
}


var debug = true; // set debug mode on/off


function show_debug(str) {
    if (debug)
        console.log.bind(console, 'Peephole:')(str);
}

function fs_init(filesystem) {
    fs = filesystem;
    show_debug('FileSystem Initialized.');
    port.postMessage({'type' : 'init'});
}

function fs_error(e) {
    show_log('Error');
    show_log(e);
}

function fs_error_and_finish_request(e) {
    show_log('Error');
    show_log(e);
    finish_request();
}

function fs_list(func) {
    if (!busy) throw 'fs_list is called without lock.';
    reader.readEntries(function(results) {
        show_debug(results);
        if (results.length == 0) {
            // Note: this could be a problem if given callback |func| further
            // asynchronous call.
            finish_request();
            return;
        }
        currentPendingEntries = results.length;
        for (var i = 0; i < results.length; i++) {
            if (func)
                func(results[i]);
        }
        fs_list(func);
    }, function(e) {
        fs_error_and_finish_request(e);
    });
}

function init_list() {
    if (!start_request()) return;

    reader = fs.root.createReader();
    show_debug('createReader: created for root');
    check_usage(fstype);

    fs_list(send_entry);
}

function change_dir(dir) {
    show_debug('ChDir: ' + dir);
    if (!start_request()) return;

    fs.root.getDirectory(
        dir,
        {create: false},
        function(entry) {
            reader = entry.createReader();
            fs_list(send_entry);
        }, function(e) {
            fs_error_and_finish_request(e);
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

            show_debug('currentPendingEntries = ' + currentPendingEntries);
            show_debug('Send: ', request);
            port.postMessage(request);
            check_send_all(entry);
        }.bind(this));
    } else {
        var request = {
            'type': 'dir',
            'name': entry.name,
            'path': entry.fullPath,
            'url': entry.toURL()
        };
        show_debug('currentPendingEntries = ' + currentPendingEntries);
        show_debug('Send: ', request);
        port.postMessage(request);
        check_send_all(entry);
    }
}

function check_send_all(entry) {
    if (--currentPendingEntries == 0) {
        port.postMessage({
            'path' : entry.fullPath,
            'type' : 'show'
        });
    }
}

function change_type(type) {
    if (!start_request()) return;

    finish_request();
    reader = null;
    fstype = type;

    window.webkitRequestFileSystem(
        fstype,
        1024 * 1024,
        fs_init,
        fs_error_and_finish_request);
}


function delete_single(path){
    show_debug('delete_single');
    // alert('je suis dans delete_single');
    if (!start_request()) return;

	fs.root.getFile(path, {create: false}, function(entry){
		remove_file(entry, function(){
        	finish_request();
		});
        finish_request();
	}, function(error) {
		if (error.name == 'TypeMismatchError')
		{
			fs.root.getDirectory(path, {create: false}, function(entry)
			{
				remove_file(entry, function()
				{
	            	finish_request();
				});
			},
			function(error)
			{
    			fs_error_and_finish_request();
			});
		}
		else
		{
			fs_error_and_finish_request();
		}
	});
}



function delete_all() {
    show_debug('delete_all');
    if (!start_request()) return;

    reader = fs.root.createReader();

    fs_list(remove_file);
}


function remove_file(entry, callback) {
    if (!busy) throw 'remove_file is called without lock.';

    show_debug('remove entry');
    if (entry.isFile) {
        entry.remove(function() {
            show_debug('File Removed');
            if(callback){
            	callback();
            }
        }, fs_error);
    } else {
        entry.removeRecursively(function() {
            show_debug('Dir Removed');
            if(callback){
            	callback();
            }
        }, fs_error);
    }
}


function check_usage(type) {
    fstype = type;
    show_debug('fstype: ' + fstype);
    webkitStorageInfo.queryUsageAndQuota(
        fstype,
        function(usage, quota) {
            port.postMessage({
            'type' : 'usage',
            'usage': usage,
            'quota': quota
            });
        }, fs_error);
}

function start_request() {
    if (busy)
        throw 'Got request while handling another one';
    busy = true;
    return true;
}

function finish_request() {
    busy = false;
    port.postMessage({
        'type' : 'finished',
    });
}

var busy = false;
var reader = null;
var fstype = window.TEMPORARY;
var fs = null;
show_debug('Loaded.');

window.webkitRequestFileSystem(
    fstype,
    1024 * 1024,
    fs_init,
    fs_error
);

port.onMessage.addListener(
    function(request) {
        show_debug(request);
        if (request.func == 'init_list') {
            init_list();
        } else if (request.func == 'change_dir') {
            change_dir(request.param);
        } else if (request.func == 'change_type') {
            change_type(request.param);
        } else if (request.func == 'delete_all') {
            delete_all();
        } else if (request.func == 'delete_single') {
            delete_single(request.param);
        } else {
            show_debug("Got unknown request " + request);
        }
        return false;
    }
);

port.onDisconnect.addListener(function() {
    console.log('disconnected');
    chrome.extension.onConnect.removeListener(listener);
    port = null;
});
});  // chrome.extension.onConnect
