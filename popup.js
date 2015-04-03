document.addEventListener('DOMContentLoaded', function() {
chrome.tabs.getSelected(undefined, function(tab) {

if (!(tab.url.match(/^https?:\/\//) || tab.url.match(/^file:\/\//))) {
  document.body.classList.add('unsupported');
  return;
}

function show_log(str) {
    console.log.bind(console, 'Peephole (popup):')(str);
}

var debug = false;
function show_debug(str) {
    if (debug)
        console.log.bind(console, 'Peephole:')(str);
}

function request_list(dir) {
    send_request('change_dir', dir + '/', null);
}

function command_init() {
    send_request('init_list', null, null);
}

function command_filedir(request) {
    show_debug('filedir');
    var current = get_target_dir(request.path);
    if (current.dir.length == 0) {
      document.getElementById('file-list-empty-label').classList.add('hide');
    }
    current.dir.push(request);
}

function command_show(node, nodeul) {
    // Set up the 'li' node for every entry.
    var li = document.createElement('li');
    var entry = document.createElement('div');
    var a = document.createElement('a');
    var aDelete = document.createElement('a');
    li.setAttribute('title', node.path);
    li.appendChild(entry);
    entry.classList.add(node.type);
    entry.classList.add('entry');
    entry.appendChild(a);
    a.appendChild(document.createTextNode(node.name));
    aDelete.setAttribute('class', 'fa fa-times');

    if (node.type == 'file') {
        var divR = document.createElement('div');
        divR.appendChild(document.createTextNode(get_unit(node.size)));
        divR.classList.add('size');
        entry.appendChild(divR);
        a.setAttribute('target', '_');
        a.setAttribute('href', node.url);
    } else {
        // if the node is Dir, ask for the inside of the dir.
        node.ul = document.createElement('ul');
        show_debug('reqType is dir: ' + node.path);
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
    li.appendChild(aDelete);
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

function clear_field() {
    show_debug('clear_field');
    rootdir = [];
    div.removeChild(rootul);
    rootul = document.createElement('ul');
    div.appendChild(rootul);
    usageDiv.innerHTML = '';
    document.getElementById('file-list-empty-label').classList.remove('hide');
}

function change_type(fstype) {
    if (fstype == current_fstype)
        return;
    if (!send_request('change_type', fstype, null))
        return;

    current_fstype = fstype;
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
    show_debug('eraseClicked');
    send_request('delete_all', null, function(){
        clear_field();
        command_init();
    });
}

function get_unit(size) {
    var unit = 0;
    while (size > 1000 && unit < 5) {
        size /= 1000;
        unit++;
    }
    if (unit == 5) return 'unlimited';
    size = Math.floor(Math.round(size * 100) / 100);
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
    show_debug('send_request: ', func);
    if (!port) {
        console.log('port is not initialized.', port);
        return false;
    }
    if (busyCount != 0) {
        console.log('busy count is ' + busyCount + '. not sending requests.');
        return false;
    }
    busy_count_up();
    finishedRequestCallback = callbackfunc;
    port.postMessage({
        'func': func,
        'param': param
    });
    return true;
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

// text for being busy
var header = document.getElementById('header');
var headText = document.createTextNode('Peephole');
header.appendChild(headText);

// set the Temporary/Persistent radio buttons
var current_fstype = window.TEMPORARY;
var temp = document.getElementById('temporary-radio');
var pers = document.getElementById('persistent-radio');
temp.addEventListener('click', function() { change_type(window.TEMPORARY); });
pers.addEventListener('click', function() { change_type(window.PERSISTENT); });

// set the delete butten
var deleteAll = document.getElementById('delete-all');
deleteAll.addEventListener('click', function() {
  var elem = document.getElementById('delete-all-confirmation');
  if (elem) {
    document.getElementById('delete-all-confirmed').addEventListener(
        'click', function() { delete_all(); elem.classList.add('hide'); });
    document.getElementById('delete-all-cancelled').addEventListener(
        'click', function() { elem.classList.add('hide'); });
    elem.classList.remove('hide');
  }
});

function onMessage(request, sender, sendResponse) {
    show_debug('Peephole (popup): onMessage:' + request.type, request);
    if (request.type == 'init') {
        command_init();
    }
    // show the size of storage use
    else if (request.type == 'usage') {
        var leftSize = request.quota - request.usage;
        usageDiv.innerHTML = get_unit(leftSize);
    }
    else if (request.type == 'show') {
        var current = get_target_dir(request.path);
        show_debug('currentdir: ', current.dir);
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
    show_debug(port);
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(onDisconnect);
});

});  // chrome.tabs.getSelected
});  // document.addEventListener
