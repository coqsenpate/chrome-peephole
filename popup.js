function request_list(dir) {
   chrome.tabs.executeScript(
     null,
     {code: '__FileScope__main.fs_chdir(\'' + dir + '\')'}
   );
}

function command_init() {
    chrome.tabs.executeScript(
      null,
      {code: '__FileScope__main.fs_list()'}
    );
}

function command_filedirCalled(request) {
    var reqPath = request.path.split('/');

    console.log('reqPath: ', reqPath);

    // Set up the 'li' node for the given new entry.
    var li = document.createElement('li');
    var a = document.createElement('a');
    li.classList.add(request.type);
    li.setAttribute('title', request.url);
    var text = document.createTextNode(request.name);
    a.setAttribute('type', 'application/octet-stream');
    a.appendChild(text);
    li.appendChild(a);

    if (request.type == 'dir') {
        console.log('reqType is dir: ' + request.path);
        request.files = new Array();
        request.ul = document.createElement('ul');
        li.appendChild(request.ul);
        a.setAttribute('href', '#');
        a.addEventListener('click', function() {
            li.classList.add('open');
            request_list(request.path);
        });
    } else {
        a.setAttribute('target', '_');
        a.setAttribute('href', request.url);
    }

    // Look up where to add this entry.
    var currentul = rootul;
    var currentdir = rootdir;
    for (var i = 1; i < reqPath.length - 1; i++) {
        for (var j = 0; j < currentdir.length; j++) {
            if (reqPath[i] == currentdir[j].name) {
                currentul = currentdir[j].ul;
                currentdir = currentdir[j].files;
                break;
            }
        }
    }
    console.log('currentdir:');
    console.log(currentdir);

    console.log('PUSH');
    currentdir.push(request);
    currentul.appendChild(li);

    console.log('rootdir:');

}

var div = document.getElementById('file-list-body');
var rootdir = new Array();
var rootul = document.createElement('ul');
div.appendChild(rootul);
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        console.log(request);
        if (request.type == 'init')
            command_init();
        else
            command_filedirCalled(request);
    });
chrome.tabs.executeScript(null, {file: 'content.js'});

