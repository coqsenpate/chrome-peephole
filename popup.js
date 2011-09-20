function request_list(dir) {
   send_request('change_dir', dir, null);
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
    var entry = document.createElement('div');
    var a = document.createElement('a');
    li.setAttribute('title', node.path);
    li.appendChild(entry);
    entry.classList.add(node.type);
    entry.classList.add('entry');
    entry.appendChild(a);
    a.appendChild(document.createTextNode(node.name));

    if (node.type == 'file') {
        var divR = document.createElement('div');
        divR.appendChild(document.createTextNode(set_unit(node.size)));
        divR.classList.add('size');
        entry.appendChild(divR);
        a.setAttribute('target', '_');
        a.setAttribute('href', node.url);
    } else {
        // if the node is Dir, ask for the inside of the dir.
        node.ul = document.createElement('ul');
        console.log('reqType is dir: ' + node.path);
        li.appendChild(node.ul);
        a.addEventListener('click', function() {
            if (node.isOpened) { // CLOSING
                entry.classList.remove('open');
                node.isOpened = false;
                li.removeChild(node.ul);
                node.ul = document.createElement('ul');
                li.appendChild(node.ul);
            } else { // OPENING
                entry.classList.add('open');
                node.files = [];
                node.isOpened = true;
                request_list(node.path);
            }
        });
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
    usageDiv.innerHTML = '';
}

function change_type(fstype) {
    if (!send_request('change_type', fstype, null))
        return;

    for (var label in {'label_temporary':0, 'label_persistent':0}) {
        var elem = document.getElementById(label);
        if (elem) {
            elem.classList.toggle('checked');
            elem.classList.toggle('unchecked');
        }
    }
    clear_field();
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

function set_unit(size) {
    var unit = 0;
    while (size > 1000 && unit < 5) {
        size /= 1000;
        unit++;
    }
    if (unit == 5) return 'unlimited';
    size = Math.round(size * 100) / 100;
    return size + ['', 'k', 'M', 'G', 'T'][unit] + 'B';
}

function busy_count_up() {
    busyCount++;
    header.removeChild(headText);
    headText = document.createTextNode('Peephole (Processing...)');
    header.appendChild(headText);
}

function busy_count_down() {
    if (busyCount <= 0) {
        console.log("busy_count_down() unexpectedly called while " +
                    "busyCount <= 0");
        return;
    }
    busyCount--;
    if (busyCount == 0) {
        header.removeChild(headText);
        headText = document.createTextNode('Peephole');
        header.appendChild(headText);
    }
    if(callback){
        callback();    
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
    console.log('send_request: ', func, param, busyCount);
    if (busyCount == 0) {
        busy_count_up();
        callback = callbackfunc;
        chrome.tabs.sendRequest(contentID, {
            'func' : func,
            'param' : param
        });
        return true;
    }
    return false;
}

// div for filelist
var div = document.getElementById('file-list-body');
var rootdir = []; // holds all the element (file/dir)
var rootul = document.createElement('ul');
div.appendChild(rootul);

var busyCount = 0;
var callback = null;
var contentID = 0;

// div for storage size
var usageDiv = document.getElementById('usage');

// text for being busy
var header = document.getElementById('header');
var headText = document.createTextNode('Peephole');
header.appendChild(headText);

// set the Temporary/Persistent radio buttons
var temp = document.getElementById('temporary-radio');
var pers = document.getElementById('persistent-radio');
temp.addEventListener('click', function() {
    change_type(window.TEMPORARY);
});
pers.addEventListener('click', function() {
    change_type(window.PERSISTENT);
});

// set the delete butten
var deleteAll = document.getElementById('DeleteAll');
deleteAll.addEventListener('click', delete_all);

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        contentID = sender.tab.id;
        console.log(request);
        if (request.type == 'init') {
            console.log('INITIATED1');
            command_init();
        }
        // show the size of storage use
        else if (request.type == 'usage') {
            console.log('currentUsageInBytes: ' + request.usage);
            console.log('currentQuotaInBytes: ' + request.quota);

            var leftSize = request.quota - request.usage;
            usageDiv.innerHTML = set_unit(leftSize);
        }
        else if (request.type == 'show') {
            var current = get_target_dir(request.path);

            console.log('currentdir: ', current.dir);

            command_sort(current.dir);

            // show the contents of currentdir
            for (var i = 0; i < current.dir.length; i++)
                command_show(current.dir[i], current.ul);
        }
        else if (request.type == 'not busy') {
            busy_count_down();
        }
        else
            command_filedir(request);
    });
chrome.tabs.executeScript(null, {file: 'content.js'});
