const { contextBridge, ipcRenderer } = require('electron')

// RegEX for testing urls
const isURL = new RegExp(
  "^" +
    // protocol identifier (optional)
    // short syntax // still required
    "(?:(?:(?:https?|ftp):)?\\/\\/)?" +
    // user:pass BasicAuth (optional)
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
      // IP address exclusion
      // private & local networks
      "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
      "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
      "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
      // IP address dotted notation octets
      // excludes loopback network 0.0.0.0
      // excludes reserved space >= 224.0.0.0
      // excludes network & broadcast addresses
      // (first & last IP address of each class)
      "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
      "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
      "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
      // host & domain names, may end with dot
      // can be replaced by a shortest alternative
      // (?![-_])(?:[-\\w\\u00a1-\\uffff]{0,63}[^-_]\\.)+
      "(?:" +
        "(?:" +
          "[a-z0-9\\u00a1-\\uffff]" +
          "[a-z0-9\\u00a1-\\uffff_-]{0,62}" +
        ")?" +
        "[a-z0-9\\u00a1-\\uffff]\\." +
      ")+" +
      // TLD identifier name, may end with dot
      "(?:[a-z\\u00a1-\\uffff]{2,}\\.?)" +
    ")" +
    // port number (optional)
    "(?::\\d{2,5})?" +
    // resource path (optional)
    "(?:[/?#]\\S*)?" +
  "$", "i"
);

// function for reordering tab indexes
function reorderTabs(idRemoved) {
    // to re-order indexes
    let tab_list = Array.from(document.getElementById('tabs').children)
    //delete all children
    //document.getElementById('tabs').replaceChildren()
    //re-order and re-id children
    for (let i = 0; i < tab_list.length; i++ ) {
      document.getElementById('tabs').children[i].id = i
    }
}


//connects index.js to main.js
contextBridge.exposeInMainWorld('example', {
  ping: () => /** using this will send a message to main, to which main will respond. lets index.js talk to main.js */ ipcRenderer.invoke('ping')
})

// handle webpage functions (index -> main)
contextBridge.exposeInMainWorld('webpage', {
  open: (url) => ipcRenderer.invoke("openPage", url),
  validate: (url) => isURL.test(url),
  goBack: () => ipcRenderer.invoke('goBack'),
  goForward: () => ipcRenderer.invoke('goForward'),
  refresh: () => ipcRenderer.invoke('refresh'),
  addTab: () => ipcRenderer.invoke('addTab'),
  switchTab: (id) => ipcRenderer.invoke('switchTab', id),
  removeTab: (id) => ipcRenderer.invoke('removeTab', id)
})

//handle messages from main 
ipcRenderer.on('urlUpdated', (event, url) => {
  if (url != 'https://duckduckgo.com/') {
    document.getElementById("searchBar").value = url
  } else {
    document.getElementById("searchBar").value = ""
  }
})

ipcRenderer.on('cannotGoBack', (event) => {
  document.getElementById('back').classList.add('unusable')
})

ipcRenderer.on('canGoBack', (event) => {
  document.getElementById('back').classList.remove('unusable')
})

ipcRenderer.on('cannotGoForward', (event) => {
  document.getElementById('forwards').classList.add('unusable')
})

ipcRenderer.on('canGoForward', (event) => {
  document.getElementById('forwards').classList.remove('unusable')
})

ipcRenderer.on('loading...', (event) => {
  document.getElementById('refresh').innerHTML = '<img src="img/loading.gif" width="16" height="16"></img>'
})

ipcRenderer.on('done-loading', (event) => {
  document.getElementById('refresh').innerHTML = '<img src="img/reload.png" width="16" height="16"></img>'
})

ipcRenderer.on('title-updated', (event, title, currTab) => {
  document.getElementById('' + currTab + '').innerHTML = '<div class="title" onclick="webpage.switchTab(this.parentNode.id)">' + title + '</div><button class="close-tab" onclick="webpage.removeTab(this.parentNode.id)">&#x2715;</button>'
})

ipcRenderer.on('new-tab', (event, tabId) => {
  document.getElementById('tabs').innerHTML += '<div id="' + tabId + '" class="tab active-tab"><div class="title" onclick="webpage.switchTab(this.parentNode.id)">New Tab</div><button class="close-tab" onclick="webpage.removeTab(this.parentNode.id)">&#x2715;</button></div>  '
})

ipcRenderer.on('tab-destroyed', (event, id) => {
  //remove destroyed tab
  document.getElementById(id).parentNode.removeChild(document.getElementById(id))
  reorderTabs(id)

  // check if scroll arrows needed or not
  let tabs = document.getElementById("tabs")
  let tabBar = document.getElementById("tab-bar")   
  let tabsW =  window.getComputedStyle(tabs).getPropertyValue('width').slice(0, -2)
  let maxW = window.getComputedStyle(tabBar).getPropertyValue('width').slice(0, -2)
  tabsW = parseInt(tabsW)
  maxW = parseInt(maxW) - (window.innerWidth * 0.1)

  if (tabsW <= maxW) {
    document.getElementById('scroll-button-left').classList.add('hide')
    document.getElementById('scroll-button-right').classList.add('hide')
  }
})

ipcRenderer.on('check-scroll-arrows', (e) => {
  // basically should fire every window size change

  // check if scroll arrows needed or not
  let tabs = document.getElementById("tabs")
  let tabBar = document.getElementById("tab-bar")   
  let tabsW =  window.getComputedStyle(tabs).getPropertyValue('width').slice(0, -2)
  let maxW = window.getComputedStyle(tabBar).getPropertyValue('width').slice(0, -2)
  tabsW = parseInt(tabsW)
  maxW = parseInt(maxW) - (window.innerWidth * 0.1)


  if (tabsW <= maxW) {
    document.getElementById('scroll-button-left').classList.add('hide')
    document.getElementById('scroll-button-right').classList.add('hide')
  } else {
    //now check for if we should add them
    maxW = parseInt(maxW) - (window.innerWidth * 0.2) - 5
    if (tabsW >= maxW) {
      document.getElementById('scroll-button-left').classList.remove('hide')
      document.getElementById('scroll-button-right').classList.remove('hide')
    }
  }
  
})