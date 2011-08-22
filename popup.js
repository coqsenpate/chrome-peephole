function request_list(dir) {
    div.removeChild(ul);
    ul = document.createElement('ul');
    div.appendChild(ul);
    chrome.tabs.executeScript(null, {code: '__FileScope__main.fs_chdir(\'' + dir + '\')'});
}

function command_init() {
    chrome.tabs.executeScript(null, {code: '__FileScope__main.fs_list()'});
}

function command_filedir(request) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    var text;
    if (request.type == 'file') {
        li.setAttribute('class', 'file');
        a.setAttribute('href', request.url);
        li.setAttribute('title', request.url);
        text = document.createTextNode(request.name);
    } else {
        li.setAttribute('class', 'dir');
        li.setAttribute('title', '[dir]');
        a.setAttribute('href', 'javascript:request_list(\'' + request.name + '\')');
        text = document.createTextNode(request.name);
    }
    a.setAttribute('target', '_');
    a.setAttribute('type', 'application/octet-stream');
    //a.setAttribute('download', request.name);
    a.appendChild(text);
    li.appendChild(a);
    ul.appendChild(li);
}

var div = document.getElementById('file-list-body');
var ul = document.createElement('ul');
div.appendChild(ul);
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        console.log(request);
        if (request.type == 'init')
            command_init();
        else
            command_filedir(request);
    });
chrome.tabs.executeScript(null, {file: 'content.js'});

// TODO: drag & drop
// TODO: sort files