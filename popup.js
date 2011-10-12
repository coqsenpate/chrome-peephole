document.addEventListener('DOMContentLoaded', function() {
chrome.tabs.getSelected(undefined, function(tab) {

function show_log(str) {
    console.log.bind(console, 'Peephole (popup):')(str);
}

function request_list(dir) {
    send_request('change_dir', dir + '/', null);
}

function command_init() {
    send_request('init_list', null, null);
}

function command_filedir(request) {
    console.log('filedir');
    var current = get_target_dir(request.path);
    current.dir.push(request);
}

function command_show(node, nodeul) {
    // Set up the 'li' node for every entry.
    var li = document.createElement('li');
    var a = document.createElement('a');
    li.setAttribute('class', node.type);
    li.setAttribute('title', node.path);
    var text = document.createTextNode(node.name);
    var img = document.createElement('img'); // file dir icon
    li.appendChild(a);

    if (node.type == 'file') {
        var divR = document.createElement('div');
        divR.setAttribute('align', 'right');
        divR.appendChild(document.createTextNode(get_unit(node.size)));
        img.setAttribute('src', '/images/icon_file.png');
        img.setAttribute('alt', '[file]');
        a.appendChild(img);
        a.appendChild(text);
        a.appendChild(divR);
        a.setAttribute('target', '_');
        a.setAttribute('href', node.url);
    } else {
        // if the node is Dir, ask for the inside of the dir.
        var img2 = document.createElement('img'); // open close icon
        img2.setAttribute('src', '/images/icon_arrow_down.png');
        img2.setAttribute('alt', 'Open');
        node.ul = document.createElement('ul');
        console.log('reqType is dir: ' + node.path);
        li.appendChild(node.ul);
        img.setAttribute('src', '/images/icon_folder.png');
        img.setAttribute('alt', '[dir]');
        a.addEventListener('click', function() {
            if (busyCount == 0){
                if (node.isOpened) { // CLOSING
                    img2.setAttribute('src', '/images/icon_arrow_down.png');
                    li.classList.remove('open');
                    node.isOpened = false;
                    li.removeChild(node.ul);
                    node.ul = document.createElement('ul');
                    li.appendChild(node.ul);
                } else { // OPENING
                    img2.setAttribute('src', '/images/icon_arrow_right.png');
                    li.classList.add('open');
                    node.files = [];
                    node.isOpened = true;
                    request_list(node.path);
                }
            }
        });
        a.appendChild(img2);
        a.appendChild(img);
        a.appendChild(text);
        a.setAttribute('href', '#');
    }
    nodeul.appendChild(li);
}

function command_sort(dir) {
    dir.sort(function(a, b) {
        var nameA = a.name.toLowerCase();
        var nameB = b.name.toLowerCase();
        if (a.type != b.type) {
            if (a.type == 'dir') return -1;
            else return 1;
        } else {
            if (nameA < nameB) return -1;
            else if (nameA > nameB) return 1;
            else return 0;
        }
    });
}

function clear_field(){
    rootdir = [];
    div.removeChild(rootul);
    rootul = document.createElement('ul');
    div.appendChild(rootul);
    usageDiv.removeChild(usageText);
    usageText = document.createTextNode('');
    usageDiv.appendChild(usageText);
}

function change_type(fstype) {
    if (busyCount > 0) {
        console.log("change_type is called while busy count is > 0.");
        return;
    }
    clear_field();
    send_request('change_type', fstype, null);
}

function delete_all() {
    var messagetext = 'Are you sure you want to ';
    messagetext += 'delete ALL FILES and DIRECTORIES?';
    if (confirm(messagetext)) {
        console.log('eraseClicked');
        send_request('delete_all', null, function(){
            clear_field();
            command_init();
            alert('Content is Deleted.');
        });
    } else {
        alert('Deleting cancelled.');
    }
}

function get_unit(size) {
    var unit = 0;
    while (size > 1000 && unit < 5) {
        size /= 1000;
        unit++;
    }
    if (unit == 5) return 'unlimited';
    size = Math.round(size * 100) / 100;
    return size + ['', 'K', 'M', 'G', 'T'][unit] + 'B';
}

function busy_count_up() {
    busyCount++;
    header.removeChild(headText);
    headText = document.createTextNode('Peephole (Processing...)');
    header.appendChild(headText);
}

function busy_count_down() {
    if (busyCount <= 0) {
        console.log('ERROR: busy_count_down() is called while busyCount <= 0');
        return;
    }

    busyCount--;
    if (busyCount == 0) {
        header.removeChild(headText);
        headText = document.createTextNode('Peephole');
        header.appendChild(headText);

        if (finishedRequestCallback) {
            finishedRequestCallback();
        }
    } else if (busyCount < 0) {
        throw 'busyCount goes negative';
    }
}

function get_target_dir(path) {
    var splitted = path.split('/');

    var currentul = rootul;
    var currentdir = rootdir;
    for (var i = 1; i < splitted.length - 1; i++) {
        for (var j = 0; j < currentdir.length; j++) {
            if (splitted[i] == currentdir[j].name) {
                currentul = currentdir[j].ul;
                currentdir = currentdir[j].files;
                break;
            }
        }
    }
    return { dir: currentdir, ul: currentul};
}

function send_request(func, param, callbackfunc) {
    console.log('send_request: ', func);
    if (!port) {
        console.log('port is not initialized.', port);
        return;
    }
    if (busyCount == 0) {
        busy_count_up();
        finishedRequestCallback = callbackfunc;
        port.postMessage({
            'func': func,
            'param': param
        });
    }
}

// div for filelist
var div = document.getElementById('file-list-body');
var rootdir = []; // holds all the element (file/dir)
var rootul = document.createElement('ul');
div.appendChild(rootul);

var busyCount = 0;
var finishedRequestCallback = null;

// div for storage size
var usageDiv = document.getElementById('usage');
var usageText = document.createTextNode('');

// text for being busy
var header = document.getElementById('header');
var headText = document.createTextNode('Peephole');
header.appendChild(headText);

// set the Temporary/Persistent radio buttons
var temp = document.getElementById('Temporary');
var pers = document.getElementById('Persistent');
temp.addEventListener('click', function() { change_type(window.TEMPORARY); });
pers.addEventListener('click', function() { change_type(window.PERSISTENT); });

// set the delete butten
var deleteAll = document.getElementById('DeleteAll');
deleteAll.addEventListener('click', delete_all);

function onMessage(request, sender, sendResponse) {
    console.log('Peephole (popup): onMessage:' + request.type, request);
    if (request.type == 'init') {
        command_init();
    }
    // show the size of storage use
    else if (request.type == 'usage') {
        console.log('currentUsageInBytes: ' + request.usage);
        console.log('currentQuotaInBytes: ' + request.quota);

        var leftSize = request.quota - request.usage;
        usageText = document.createTextNode(
                'Size left: ' + get_unit(leftSize));
        usageDiv.appendChild(usageText);
    }
    else if (request.type == 'show') {
        var current = get_target_dir(request.path);

        console.log('currentdir: ', current.dir);

        command_sort(current.dir);

        // show the contents of currentdir
        for (var i = 0; i < current.dir.length; i++)
            command_show(current.dir[i], current.ul);
    }
    else if (request.type == 'finished') {
        busy_count_down();
    }
    else {
        command_filedir(request);
    }
    return false;
}

function onDisconnect() {
    port = null;
    console.warning('disconnected');
}

chrome.tabs.executeScript(tab.id, {file: 'content.js'}, function() {
    port = chrome.tabs.connect(tab.id);
    console.log(port);
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(onDisconnect);
});

});  // chrome.tabs.getSelected
});  // document.addEventListener
