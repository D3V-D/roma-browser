const { contextBridge, ipcRenderer } = require('electron')

//connects index.js to main.js
contextBridge.exposeInMainWorld('example', {
  ping: () => /** using this will send a message to main, to which main will respond. lets index.js talk to main.js */ ipcRenderer.invoke('ping')
})

// another context bridge :)
contextBridge.exposeInMainWorld('webpage', {
  open: (url) => ipcRenderer.invoke("openPage", url)
})